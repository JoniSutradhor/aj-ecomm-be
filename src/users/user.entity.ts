import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { UserRole } from './user-role.enum';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    email: string;

    @Column()
    fname: string;

    @Column()
    lname: string;

    @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
    role: UserRole;

    @Column({ select: false })
    passwordHash: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

export type PublicUser = Pick<User, 'id' | 'email' | 'fname' | 'lname' | 'role'>;

export const toPublicUser = (user: User): PublicUser => ({
    id: user.id,
    email: user.email,
    fname: user.fname,
    lname: user.lname,
    role: user.role,
});
