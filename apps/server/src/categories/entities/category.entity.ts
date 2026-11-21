import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/** A life area (Health, Work, …) with an icon and a colour: the Today filter chips. */
@Entity('categories')
export class CategoryEntity extends BaseEntity {
  @Column('text')
  name: string;

  @Column('text')
  icon: string;

  @Column('text')
  color: string;

  @Column('int', { default: 0 })
  position: number;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;
}
