import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/** A work context (Mia, a client, a repo); separate from life-area categories. */
@Entity('projects')
export class ProjectEntity extends BaseEntity {
  @Column('text')
  name: string;

  @Column('text', { unique: true })
  slug: string;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;
}
