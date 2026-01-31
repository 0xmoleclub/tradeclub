import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { IPaginatedResponse } from '../interfaces';

export const ApiPaginatedResponse = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description: 'Paginated list of items',
      schema: {
        allOf: [
          {
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              meta: {
                type: 'object',
                properties: {
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  totalItems: { type: 'number' },
                  totalPages: { type: 'number' },
                  hasNextPage: { type: 'boolean' },
                  hasPreviousPage: { type: 'boolean' },
                },
              },
              message: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        ],
      },
    }),
  );
};
