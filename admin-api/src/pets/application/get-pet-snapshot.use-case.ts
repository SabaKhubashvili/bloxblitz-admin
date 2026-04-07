import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PetSnapshotResponseDto,
  PetValueColumnDto,
} from '../presentation/dto/pet-snapshot.response.dto';

const petSelect = {
  id: true,
  name: true,
  image: true,
  rarity: true,
  rvalue_nopotion: true,
  rvalue_ride: true,
  rvalue_fly: true,
  rvalue_flyride: true,
  nvalue_nopotion: true,
  nvalue_ride: true,
  nvalue_fly: true,
  nvalue_flyride: true,
  mvalue_nopotion: true,
  mvalue_ride: true,
  mvalue_fly: true,
  mvalue_flyride: true,
} as const;

@Injectable()
export class GetPetSnapshotUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(petId: number): Promise<PetSnapshotResponseDto> {
    const p = await this.prisma.pets.findUnique({
      where: { id: petId },
      select: petSelect,
    });
    if (!p) {
      throw new NotFoundException(`Pet ${petId} not found`);
    }
    const values: PetValueColumnDto = {
      rvalue_nopotion: p.rvalue_nopotion,
      rvalue_ride: p.rvalue_ride,
      rvalue_fly: p.rvalue_fly,
      rvalue_flyride: p.rvalue_flyride,
      nvalue_nopotion: p.nvalue_nopotion,
      nvalue_ride: p.nvalue_ride,
      nvalue_fly: p.nvalue_fly,
      nvalue_flyride: p.nvalue_flyride,
      mvalue_nopotion: p.mvalue_nopotion,
      mvalue_ride: p.mvalue_ride,
      mvalue_fly: p.mvalue_fly,
      mvalue_flyride: p.mvalue_flyride,
    };
    const dto = new PetSnapshotResponseDto();
    dto.id = p.id;
    dto.name = p.name;
    dto.image = p.image;
    dto.rarity = p.rarity;
    dto.values = values;
    return dto;
  }
}
