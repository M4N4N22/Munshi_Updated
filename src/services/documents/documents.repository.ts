import { Injectable } from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import {
  Document,
  DocumentExtraction,
  DocumentProcessingJob,
  DocumentSuggestion,
} from './documents.schema';

@Injectable()
export class DocumentRepository {
  readonly documentModel: typeof Document;
  readonly jobModel: typeof DocumentProcessingJob;
  readonly extractionModel: typeof DocumentExtraction;
  readonly suggestionModel: typeof DocumentSuggestion;

  constructor(private readonly dbService: DbService) {
    this.documentModel = this.dbService.sqlService.Document;
    this.jobModel = this.dbService.sqlService.DocumentProcessingJob;
    this.extractionModel = this.dbService.sqlService.DocumentExtraction;
    this.suggestionModel = this.dbService.sqlService.DocumentSuggestion;
  }

  get sequelize() {
    return this.documentModel.sequelize!;
  }

  findFactoryById(factoryId: number) {
    return this.dbService.sqlService.Factory.findByPk(factoryId);
  }

  findDocumentById(id: number, factoryId: number) {
    return this.documentModel.findOne({ where: { id, factory_id: factoryId } });
  }

  listDocuments(factoryId: number) {
    return this.documentModel.findAll({
      where: { factory_id: factoryId },
      order: [['id', 'DESC']],
    });
  }

  createDocument(data: Record<string, unknown>) {
    return this.documentModel.create(data as any);
  }

  updateDocument(id: number, factoryId: number, patch: Record<string, unknown>) {
    return this.documentModel.update(patch as any, {
      where: { id, factory_id: factoryId },
    });
  }

  createJob(data: Record<string, unknown>) {
    return this.jobModel.create(data as any);
  }

  updateJob(id: number, patch: Record<string, unknown>) {
    return this.jobModel.update(patch as any, { where: { id } });
  }

  createExtraction(data: Record<string, unknown>) {
    return this.extractionModel.create(data as any);
  }

  findExtractionById(id: number, factoryId: number) {
    return this.extractionModel.findOne({
      where: { id, factory_id: factoryId },
    });
  }

  listExtractions(documentId: number, factoryId: number) {
    return this.extractionModel.findAll({
      where: { document_id: documentId, factory_id: factoryId },
      order: [['id', 'DESC']],
    });
  }

  createSuggestion(data: Record<string, unknown>) {
    return this.suggestionModel.create(data as any);
  }

  findSuggestionById(id: number, factoryId: number) {
    return this.suggestionModel.findOne({
      where: { id, factory_id: factoryId },
    });
  }

  listSuggestions(documentId: number, factoryId: number) {
    return this.suggestionModel.findAll({
      where: { document_id: documentId, factory_id: factoryId },
      order: [['id', 'ASC']],
    });
  }

  listPendingSuggestions(factoryId: number) {
    return this.suggestionModel.findAll({
      where: { factory_id: factoryId, status: 'PENDING' },
      order: [['id', 'ASC']],
    });
  }

  updateSuggestion(
    id: number,
    factoryId: number,
    patch: Record<string, unknown>,
  ) {
    return this.suggestionModel.update(patch as any, {
      where: { id, factory_id: factoryId },
    });
  }
}
