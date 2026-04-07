import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GetPetSnapshotUseCase } from './application/get-pet-snapshot.use-case';
import { SearchPetsByNameUseCase } from './application/search-pets-by-name.use-case';
import { PetsController } from './presentation/pets.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PetsController],
  providers: [GetPetSnapshotUseCase, SearchPetsByNameUseCase],
})
export class PetsModule {}
