import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @MessagePattern({cmd: 'create'})
  create(@Payload() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @MessagePattern({cmd: 'get_all'})
  findAll(@Payload() paginationDto: PaginationDto) {
    return this.productsService.findAll(paginationDto);
  }

  //@Get("/deleted")
  @MessagePattern({cmd: 'get_all_deleted'})
  findAllDeleted() {
    return this.productsService.findAllDeleted();
  }

  //@Get("/tags")
  @MessagePattern({ cmd: 'get_all_tags' })
  findAllTags() {
    return this.productsService.findAllTags();
  }

  //@Get(':term')
  @MessagePattern({ cmd: 'get_by' })
  findOne(@Payload() term: string) {
    return this.productsService.findOnePlain(term);
  }

  @MessagePattern({ cmd: 'update' })
  update(@Payload() data: { id: string, updateProductDto: UpdateProductDto }) {
    console.log(data)
    return this.productsService.update(data.id, data.updateProductDto);
  }

  @MessagePattern({ cmd: 'delete' })
  remove(@Payload() id: string){
    return this.productsService.remove(id);
  }

  @MessagePattern({ cmd: 'restore' })
  restore(@Payload() id: string){
    return this.productsService.restore(id);
  }
}
