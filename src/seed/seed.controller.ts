import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SeedService } from './seed.service';
import { MessagePattern } from '@nestjs/microservices';


@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @MessagePattern({ cmd: 'seed' })
  seed() {
    return this.seedService.runSeed();
  }

}
