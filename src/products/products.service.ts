import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUID } from 'uuid'
import { ProductImage } from './entities/product-img.entity';
import { RpcException } from '@nestjs/microservices';
@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly datasource: DataSource
  ) { }

  async create(createProductDto: CreateProductDto) {
    this.logger.log(createProductDto)
    try {
      const { images = [], ...productDetails } = createProductDto;

      //Creación
      const product = this.productRepository.create({
        ...productDetails,
        images: images.map(image => this.productImageRepository.create({ url: image }))
      })
      //Impacto en DB
      await this.productRepository.save(product);

      return { ...product, images }
    } catch (error) {
      this.handleExceptions(error)
    }

  }

  async findAll(paginationDto: PaginationDto) {
    this.logger.log(paginationDto)
    const { limit = 10, offset = 0 } = paginationDto
    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
      relations: {
        images: true
      },
      where: { visible: true }
    })
    return products.map(product => ({
      ...product,
      images: product.images.map(img => img.url)
    }))
  }

  async findAllDeleted() {
    const products = await this.productRepository.find({
      relations: {
        images: true
      },
      where: { visible: false }
    })
    return products.map(product => ({
      ...product,
      images: product.images.map(img => img.url)
    }))
  }

  async findAllTags() {

    const products = await this.productRepository.find({})
    const allTags = new Set();

    products.map(product => {
      product.tags.forEach(tag => allTags.add(tag));
    });
    const uniqueTags = Array.from(allTags);
    return {
      tags: uniqueTags
    };
  }

  async findOne(term: string) {
    this.logger.log(term)

    let product: Product;
    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term })
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder('prod');
      product = await queryBuilder
        .where('title=LOWER(:title) or slug=:slug', {
          title: term,
          slug: term
        })
        .leftJoinAndSelect('prod.images', 'prodImages')
        .getOne()
    }
    if (!product)
      throw new RpcException("Product Not Found")
    return product
  }

  async findOnePlain(term: string) {
    this.logger.log(term)
    const { images = [], ...rest } = await this.findOne(term)
    return {
      ...rest,
      images: images.map(image => image.url)
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    console.log("Actualizando")
    // Verifica si updateProductDto es undefined
    if (!updateProductDto) {
      throw new RpcException('El cuerpo de la solicitud es inválido o está vacío.');
    }
    const { images, ...toUpdate } = updateProductDto

    const product = await this.productRepository.preload({
      id: id,
      ...toUpdate
    })

    if (!product)
      throw new RpcException("Product Not Found")

    //Query Runner
    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {

      if (images) {
        await queryRunner.manager.delete(ProductImage, { product: { id } })

        product.images = images.map(image => this.productImageRepository.create({ url: image }))
      }
      console.log(images)

      await queryRunner.manager.save(product);
      // await this.productRepository.save(product)
      await queryRunner.commitTransaction()
      console.log("se actualizo")
      return this.findOnePlain(id)
    } catch (error) {
      this.handleExceptions(error)
    } finally {

      await queryRunner.release()
    }
    console.log("FIn Actualizando")

  }

  async remove(id: string) {
    this.logger.log(id)

    const product = await this.findOne(id)
    //await this.productRepository.remove(product);

    product.visible = false;
    await this.productRepository.save(product);
    return { msg: "removed", product }
  }

  async restore(id: string) {
    const product = await this.productRepository.findOne({ where: { id, visible: false } });
    if (!product) {
      throw new RpcException(`Product with id ${id} not found`);
    }
    product.visible = true;
    await this.productRepository.save(product);
    return { product }
  }

  private handleExceptions(error: any) {
    if (error.code === '23505') {
      throw new RpcException("Error on CLothes Ms: " + error.detail)
    }
    this.logger.error(error)
    throw new RpcException("Unexpected error: check logs")
  }

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product')
    try {
      return await query.delete().execute()
    } catch (error) {
      this.handleExceptions(error)
    }
  }

}
