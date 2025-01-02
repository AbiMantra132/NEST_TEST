import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    try {
      // Get the token from cookies
      const token = req.cookies['auth-token'];

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if the user role is ADMIN or USER
      const data = decoded["User"] as User;

      if(data.role !== 'ADMIN' && data.role === 'USER') {
        throw new ForbiddenException('You are not authorized to access this route');
      }

      // Add the decoded user to the request object
      req['user'] = decoded;


      next();
    } catch (error) {
      throw new UnauthorizedException('Invalid token or not authenticated');
    }
  } 
}
