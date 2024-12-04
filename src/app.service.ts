import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): object {
    return { "msg": 'Coba Di Test Ke Route /major mas wir'};
  }
}
