import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class VerifyScanDto {
  @ApiProperty({
    description: 'Contenu brut du QR Code scanne (jeton opaque, cahier §17)',
  })
  @IsString()
  token: string;

  @ApiProperty()
  @IsUUID()
  matchId: string;

  @ApiPropertyOptional({ description: 'Zone controlee (point de passage)' })
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @ApiProperty({ description: "Identifiant de l'appareil de controle" })
  @IsString()
  deviceId: string;

  @ApiPropertyOptional({
    description:
      'Nom humain du poste de controle (ex. "Porte Media 1 (Diamniadio Nord)")',
  })
  @IsOptional()
  @IsString()
  gate?: string;
}
