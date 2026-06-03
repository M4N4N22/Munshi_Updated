import { Global, Module } from '@nestjs/common';
import { UserController, UserService } from './users.service';

@Global()
@Module({
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
