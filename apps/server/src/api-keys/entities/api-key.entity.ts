import { BeforeInsert, Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

/** An API key: stored as sha256; the derived webhook / webapp secrets are kept, the plain key never is. */
@Entity('api_keys')
export class ApiKeyEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('text')
  name: string;

  @Column('text')
  prefix: string;

  @Column({ name: 'key_hash', type: 'text', unique: true, select: false })
  keyHash: string;

  @Column({ name: 'webapp_secret', type: 'text', select: false })
  webappSecret: string;

  @Column({ name: 'webhook_secret', type: 'text', select: false })
  webhookSecret: string;

  @Column({ name: 'events_url', type: 'text', nullable: true })
  eventsUrl: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @BeforeInsert()
  protected assignId(): void {
    if (!this.id) this.id = uuidv7();
  }
}
