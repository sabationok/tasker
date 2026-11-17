import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('tags')
export class TagEntity extends BaseEntity {
  @Column('text', { unique: true })
  name: string;
}
