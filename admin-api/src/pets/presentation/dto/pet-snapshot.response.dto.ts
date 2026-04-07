export class PetValueColumnDto {
  rvalue_nopotion: number;
  rvalue_ride: number;
  rvalue_fly: number;
  rvalue_flyride: number;
  nvalue_nopotion: number;
  nvalue_ride: number;
  nvalue_fly: number;
  nvalue_flyride: number;
  mvalue_nopotion: number;
  mvalue_ride: number;
  mvalue_fly: number;
  mvalue_flyride: number;
}

export class PetSnapshotResponseDto {
  id: number;
  name: string;
  image: string;
  rarity: string;
  values: PetValueColumnDto;
}
