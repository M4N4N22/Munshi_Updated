import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateDocumentDto,
  DocumentFactoryQueryDto,
  RejectSuggestionDto,
  StartSuggestionApprovalDto,
  StoreExtractionDto,
  UploadDocumentDto,
} from './documents.dto';
import { DocumentService } from './documents.service';
import type { UploadedFilePayload } from './documents.service';

@ApiTags('documents')
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get('registry/types')
  @ApiOperation({ summary: 'List registered document type contracts' })
  listDocumentTypes() {
    return this.documentService.listDocumentTypes();
  }

  @Get()
  @ApiOperation({ summary: 'List documents for a factory' })
  list(@Query() query: DocumentFactoryQueryDto) {
    return this.documentService.listDocuments(query.factory_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by id (factory-scoped)' })
  getDocument(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: DocumentFactoryQueryDto,
  ) {
    return this.documentService.getDocument(id, query.factory_id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload document file and start processing pipeline' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'factory_id'],
      properties: {
        file: { type: 'string', format: 'binary' },
        factory_id: { type: 'number', example: 1 },
        uploaded_by: { type: 'number', example: 42 },
        document_type: { type: 'string', example: 'INVENTORY_IMPORT' },
        auto_process: { type: 'boolean', example: true },
      },
    },
  })
  upload(
    @UploadedFile() file: UploadedFilePayload,
    @Body() dto: UploadDocumentDto,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('file is required');
    }
    return this.documentService.uploadDocument(file, dto);
  }

  @Post(':id/process')
  @ApiOperation({ summary: 'Re-run document ingestion orchestrator' })
  processDocument(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: DocumentFactoryQueryDto,
  ) {
    return this.documentService.processDocument(id, query.factory_id);
  }

  @Post()
  @ApiOperation({ summary: 'Register document metadata (no parsing)' })
  create(@Body() dto: CreateDocumentDto) {
    return this.documentService.createDocument(dto);
  }

  @Post(':id/extractions')
  @ApiOperation({
    summary: 'Store structured extraction payload from future LLM parser',
  })
  storeExtraction(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StoreExtractionDto,
  ) {
    return this.documentService.storeExtraction(id, dto);
  }

  @Post(':id/extractions/:extractionId/suggestions')
  @ApiOperation({ summary: 'Generate suggestions from stored extraction' })
  generateSuggestions(
    @Param('id', ParseIntPipe) id: number,
    @Param('extractionId', ParseIntPipe) extractionId: number,
    @Query() query: DocumentFactoryQueryDto,
  ) {
    return this.documentService.generateSuggestions(
      id,
      extractionId,
      query.factory_id,
    );
  }

  @Get(':id/suggestions')
  @ApiOperation({ summary: 'List suggestions for a document' })
  listSuggestions(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: DocumentFactoryQueryDto,
  ) {
    return this.documentService.listSuggestions(id, query.factory_id);
  }

  @Post('suggestions/:suggestionId/approve-workflow')
  @ApiOperation({
    summary: 'Start YES/NO approval workflow for a pending suggestion',
  })
  startApproval(
    @Param('suggestionId', ParseIntPipe) suggestionId: number,
    @Body() dto: StartSuggestionApprovalDto,
  ) {
    return this.documentService.startSuggestionApproval(suggestionId, dto);
  }

  @Post('suggestions/:suggestionId/reject')
  @ApiOperation({ summary: 'Reject a pending suggestion via REST' })
  rejectSuggestion(
    @Param('suggestionId', ParseIntPipe) suggestionId: number,
    @Body() dto: RejectSuggestionDto,
  ) {
    return this.documentService.rejectSuggestion(
      suggestionId,
      dto.factory_id,
      dto.reason,
    );
  }
}
