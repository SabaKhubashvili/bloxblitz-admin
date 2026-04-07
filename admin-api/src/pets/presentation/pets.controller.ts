import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRoles } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { GetPetSnapshotUseCase } from '../application/get-pet-snapshot.use-case';
import { SearchPetsByNameUseCase } from '../application/search-pets-by-name.use-case';
import { PetSnapshotResponseDto } from './dto/pet-snapshot.response.dto';
import { SearchPetsQueryDto } from './dto/search-pets.query.dto';

/**
 * Staff JWT routes must skip `login` / `twoFactor` throttlers (they apply
 * globally; pet name search would hit the 5 req/min login bucket quickly).
 */
@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/pets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class PetsController {
  constructor(
    private readonly getPetSnapshot: GetPetSnapshotUseCase,
    private readonly searchPetsByName: SearchPetsByNameUseCase,
  ) {}

  /**
   * Must use a non-numeric path; an unconstrained `:petId` route can otherwise
   * match `/admin/pets/search` and `ParseIntPipe` fails on `"search"`.
   */
  @Get('search')
  async search(
    @Query() query: SearchPetsQueryDto,
  ): Promise<PetSnapshotResponseDto[]> {
    return this.searchPetsByName.execute(query.q);
  }

  @Get(':petId')
  async snapshot(
    @Param('petId', ParseIntPipe) petId: number,
  ): Promise<PetSnapshotResponseDto> {
    return this.getPetSnapshot.execute(petId);
  }
}
