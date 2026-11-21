import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/**
 * An agent the user hands items to (Mia, claude). Items store its `slug` (immutable) in `assignee` / `created_by`;
 * `apiKeyId` is its credential: a caller with that key acts as this agent.
 */
@Entity('agents')
export class AgentEntity extends BaseEntity {
  @Column('text', { unique: true })
  slug: string;

  @Column('text')
  name: string;

  @Column('text', { nullable: true })
  icon: string | null;

  @Column('text', { nullable: true })
  color: string | null;

  @Column('text', { nullable: true })
  description: string | null;

  @Column({ name: 'api_key_id', type: 'uuid', nullable: true, unique: true })
  apiKeyId: string | null;
}
