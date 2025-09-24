import { IsMobilePhone, IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginUserDto {
  @IsMobilePhone('zh-CN', {}, { message: '请输入正确的手机号' })
  phone: string;

  @IsString({ message: '密码必须为字符串' })
  @Length(6, 20, { message: '密码长度需在 6-20 位之间' })
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;
}