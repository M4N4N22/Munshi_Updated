import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryTypes } from 'sequelize';
import { DbService } from 'src/core/services/db-service/db.service';
import type {
  AdminClientDetail,
  AdminClientEmployee,
  AdminClientInventoryItem,
  AdminClientSummaryRow,
  AdminClientsOverview,
} from './admin-ops.types';

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (value == null) return '';
  return String(value);
}

function toIsoDate(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

const CLIENTS_OVERVIEW_SQL = `
  SELECT
    f.id,
    f.name,
    f.address,
    f.created_at,
    (
      SELECT u.name
      FROM factory_users owner_fu
      JOIN users u ON u.id = owner_fu.user_id
      WHERE owner_fu.factory_id = f.id AND owner_fu.role = 'OWNER'
      ORDER BY owner_fu.id ASC
      LIMIT 1
    ) AS owner_name,
    (
      SELECT u.phone_number
      FROM factory_users owner_fu
      JOIN users u ON u.id = owner_fu.user_id
      WHERE owner_fu.factory_id = f.id AND owner_fu.role = 'OWNER'
      ORDER BY owner_fu.id ASC
      LIMIT 1
    ) AS owner_phone,
    COUNT(DISTINCT fu.id) FILTER (
      WHERE fu.role IN ('WORKER', 'MANAGER')
    )::int AS team_members,
    COUNT(DISTINCT ii.id)::int AS inventory_items,
    (MAX(
      CASE
        WHEN ic.provider = 'zoho_inventory' AND ic.status = 'active' THEN 1
        ELSE 0
      END
    ) = 1) AS zoho_connected,
    (
      SELECT bc.status
      FROM bank_consents bc
      WHERE bc.factory_id = f.id
      ORDER BY bc.updated_at DESC NULLS LAST, bc.id DESC
      LIMIT 1
    ) AS bank_consent_status
  FROM factories f
  LEFT JOIN factory_users fu ON fu.factory_id = f.id
  LEFT JOIN inventory_items ii ON ii.factory_id = f.id
  LEFT JOIN integration_connections ic ON ic.factory_id = f.id
  GROUP BY f.id, f.name, f.address, f.created_at
  ORDER BY f.created_at DESC
`;

const CLIENT_FACTORY_SQL = `
  SELECT
    f.id,
    f.name,
    f.address,
    f.created_at,
    (MAX(
      CASE
        WHEN ic.provider = 'zoho_inventory' AND ic.status = 'active' THEN 1
        ELSE 0
      END
    ) = 1) AS zoho_connected,
    (
      SELECT bc.status
      FROM bank_consents bc
      WHERE bc.factory_id = f.id
      ORDER BY bc.updated_at DESC NULLS LAST, bc.id DESC
      LIMIT 1
    ) AS bank_consent_status
  FROM factories f
  LEFT JOIN integration_connections ic ON ic.factory_id = f.id
  WHERE f.id = :factoryId
  GROUP BY f.id, f.name, f.address, f.created_at
`;

const CLIENT_EMPLOYEES_SQL = `
  SELECT
    u.id AS user_id,
    u.name,
    u.phone_number,
    fu.role,
    fu.doj,
    fu.created_at AS joined_at
  FROM factory_users fu
  JOIN users u ON u.id = fu.user_id
  WHERE fu.factory_id = :factoryId
  ORDER BY
    CASE fu.role
      WHEN 'OWNER' THEN 0
      WHEN 'MANAGER' THEN 1
      WHEN 'WORKER' THEN 2
      ELSE 3
    END,
    u.name NULLS LAST,
    u.id ASC
`;

const CLIENT_INVENTORY_SQL = `
  SELECT
    id,
    sku,
    name,
    unit,
    current_quantity,
    reorder_threshold,
    is_active,
    created_at
  FROM inventory_items
  WHERE factory_id = :factoryId
  ORDER BY name ASC, sku ASC
`;

@Injectable()
export class AdminOpsService {
  constructor(private readonly dbService: DbService) {}

  async getClientsOverview(): Promise<AdminClientsOverview> {
    const sequelize = this.dbService
      .getSqlConnection()
      .getSequelizeInstance();
    const rows = await sequelize.query<AdminClientSummaryRow>(
      CLIENTS_OVERVIEW_SQL,
      { type: QueryTypes.SELECT },
    );

    const clients = rows.map((row) => ({
      ...row,
      created_at: toIso(row.created_at),
      zoho_connected: Boolean(row.zoho_connected),
      team_members: Number(row.team_members ?? 0),
      inventory_items: Number(row.inventory_items ?? 0),
    }));

    return {
      clients,
      totals: {
        factories: clients.length,
        with_zoho: clients.filter((c) => c.zoho_connected).length,
        with_bank_consent: clients.filter(
          (c) =>
            c.bank_consent_status &&
            !['PENDING', 'pending', ''].includes(c.bank_consent_status),
        ).length,
        total_team_members: clients.reduce((n, c) => n + c.team_members, 0),
        total_inventory_items: clients.reduce(
          (n, c) => n + c.inventory_items,
          0,
        ),
      },
    };
  }

  async getClientDetail(factoryId: number): Promise<AdminClientDetail> {
    const sequelize = this.dbService
      .getSqlConnection()
      .getSequelizeInstance();

    const [factoryRows, employeeRows, inventoryRows] = await Promise.all([
      sequelize.query<{
        id: number;
        name: string;
        address: string | null;
        created_at: unknown;
        zoho_connected: boolean;
        bank_consent_status: string | null;
      }>(CLIENT_FACTORY_SQL, {
        replacements: { factoryId },
        type: QueryTypes.SELECT,
      }),
      sequelize.query<{
        user_id: number;
        name: string | null;
        phone_number: string;
        role: string;
        doj: unknown;
        joined_at: unknown;
      }>(CLIENT_EMPLOYEES_SQL, {
        replacements: { factoryId },
        type: QueryTypes.SELECT,
      }),
      sequelize.query<{
        id: number;
        sku: string;
        name: string;
        unit: string;
        current_quantity: string | number;
        reorder_threshold: string | number | null;
        is_active: boolean;
        created_at: unknown;
      }>(CLIENT_INVENTORY_SQL, {
        replacements: { factoryId },
        type: QueryTypes.SELECT,
      }),
    ]);

    const factoryRow = factoryRows[0];
    if (!factoryRow) {
      throw new NotFoundException('Factory not found');
    }

    const employees: AdminClientEmployee[] = employeeRows.map((row) => ({
      user_id: row.user_id,
      name: row.name,
      phone_number: row.phone_number,
      role: row.role,
      doj: toIsoDate(row.doj),
      joined_at: toIso(row.joined_at),
    }));

    const inventory: AdminClientInventoryItem[] = inventoryRows.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      unit: row.unit,
      current_quantity: Number(row.current_quantity ?? 0),
      reorder_threshold:
        row.reorder_threshold == null
          ? null
          : Number(row.reorder_threshold),
      is_active: Boolean(row.is_active),
      created_at: toIso(row.created_at),
    }));

    return {
      factory: {
        id: factoryRow.id,
        name: factoryRow.name,
        address: factoryRow.address,
        created_at: toIso(factoryRow.created_at),
        zoho_connected: Boolean(factoryRow.zoho_connected),
        bank_consent_status: factoryRow.bank_consent_status,
      },
      employees,
      inventory,
    };
  }
}
