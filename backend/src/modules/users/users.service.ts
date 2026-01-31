import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Generate a random 6-digit nonce
   */
  private randomNonce(): string {
    return Math.floor(Math.random() * 900000 + 100000).toString();
  }

  /**
   * Get or create nonce for wallet address
   */
  async getNonce(walletAddress: string): Promise<string> {
    const nonce = this.randomNonce();

    let user = await this.userRepository.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (user) {
      // Update existing user's nonce
      user.nonce = nonce;
      await this.userRepository.save(user);
    } else {
      // Create new user with nonce
      user = this.userRepository.create({
        walletAddress: walletAddress.toLowerCase(),
        nonce,
      });
      await this.userRepository.save(user);
    }

    return nonce;
  }

  /**
   * Clear nonce and update last login after successful login
   */
  async loginSuccess(userId: string): Promise<User> {
    const user = await this.findById(userId);

    user.nonce = null;
    user.lastLoginAt = new Date();

    return this.userRepository.save(user);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.findByWalletAddress(
      createUserDto.walletAddress,
    );
    if (existingUser) {
      throw new ConflictException('Wallet address already registered');
    }

    const user = this.userRepository.create({
      ...createUserDto,
      walletAddress: createUserDto.walletAddress.toLowerCase(),
    });

    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: [
        'id',
        'walletAddress',
        'name',
        'avatar',
        'role',
        'status',
        'lastLoginAt',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'walletAddress',
        'name',
        'avatar',
        'role',
        'status',
        'lastLoginAt',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
  }
}
