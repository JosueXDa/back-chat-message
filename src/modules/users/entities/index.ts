export * from './user.entity';
export * from './profile.entity';

import type { User } from './user.entity';
import type { Profile } from './profile.entity';

export interface UserWithProfile extends User {
    profile: Profile | null;
}
