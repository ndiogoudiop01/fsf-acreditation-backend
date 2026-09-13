import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Rapport jour de match (cahier §26) : toujours scope a un seul match. */
export class MatchDayReportDto {
  @ApiProperty()
  @IsUUID()
  matchId: string;
}
