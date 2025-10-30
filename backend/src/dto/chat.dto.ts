import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class StartChatDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}

export class ScheduleCallbackDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  preferredTime: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class SendFollowUpEmailDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}
