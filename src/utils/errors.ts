import { GraphQLError } from 'graphql';

// Custom error codes
export enum ErrorCode {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  FORBIDDEN = 'FORBIDDEN',
  BAD_USER_INPUT = 'BAD_USER_INPUT',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR'
}

// Base custom error class
export class CustomGraphQLError extends GraphQLError {
  constructor(message: string, code: ErrorCode, statusCode: number = 500) {
    super(message, {
      extensions: {
        code,
        statusCode
      }
    });
  }
}

// Specific error classes
export class AuthenticationError extends CustomGraphQLError {
  constructor(message: string = 'Bạn cần đăng nhập để thực hiện hành động này') {
    super(message, ErrorCode.UNAUTHENTICATED, 401);
  }
}

export class ForbiddenError extends CustomGraphQLError {
  constructor(message: string = 'Bạn không có quyền thực hiện hành động này') {
    super(message, ErrorCode.FORBIDDEN, 403);
  }
}

export class ValidationError extends CustomGraphQLError {
  constructor(message: string) {
    super(message, ErrorCode.BAD_USER_INPUT, 400);
  }
}

export class NotFoundError extends CustomGraphQLError {
  constructor(message: string = 'Không tìm thấy dữ liệu') {
    super(message, ErrorCode.NOT_FOUND, 404);
  }
}

export class DatabaseError extends CustomGraphQLError {
  constructor(message: string = 'Lỗi cơ sở dữ liệu', originalError?: any) {
    super(message, ErrorCode.DATABASE_ERROR, 500);
    if (originalError) {
      this.extensions.originalError = originalError.message;
    }
  }
}
