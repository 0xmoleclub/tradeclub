import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithUser } from '../interfaces';

export const CurrentUser = createParamDecorator(
  (data: keyof IRequestWithUser['user'] | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<IRequestWithUser>();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
