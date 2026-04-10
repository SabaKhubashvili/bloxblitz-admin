export type TowersRestrictionInfoDto = {
  isBanned: boolean;
  banReason: string | null;
  dailyWagerLimit: number | null;
  weeklyWagerLimit: number | null;
  monthlyWagerLimit: number | null;
  limitReason: string | null;
};

export type TowersRestrictionResponseDto = {
  username: string;
  restriction: TowersRestrictionInfoDto | null;
};
