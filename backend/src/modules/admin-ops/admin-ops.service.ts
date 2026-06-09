import { Injectable } from '@nestjs/common';
import { QueryTypes } from 'sequelize';
import { DbService } from 'src/core/services/db-service/db.service';
import type {
  AdminClientSummaryRow,
  AdminClientsOverview,
} from './admin-ops.types';

const CLIENTS_OVERVIEW_SQL = `
  SELECT
    f.id,
    f.name,
    f.address,
    f.created_at,
    owner_u.name AS owner_name,
    owner_u.phone_number AS owner_phone,
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
  LEFT JOIN factory_users owner_fu
    ON owner_fu.factory_id = f.id AND owner_fu.role = 'OWNER'
  LEFT JOIN users owner_u ON owner_u.id = owner_fu.user_id
  LEFT JOIN factory_users fu ON fu.factory_id = f.id
  LEFT JOIN inventory_items ii ON ii.factory_id = f.id
  LEFT JOIN integration_connections ic ON ic.factory_id = f.id
  GROUP BY f.id, f.name, f.address, f.created_at, owner_u.name, owner_u.phone_number
  ORDER BY f.created_at DESC
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

    const clients = rows.map((row) => {
      const created = row.created_at as unknown;
      return {
        ...row,
        created_at:
          created instanceof Date
            ? created.toISOString()
            : String(row.created_at),
        zoho_connected: Boolean(row.zoho_connected),
        team_members: Number(row.team_members ?? 0),
        inventory_items: Number(row.inventory_items ?? 0),
      };
    });

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
}
