import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
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
} from './documents.dto';
import { DocumentService } from './documents.service';

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
