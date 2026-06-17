import jwt from 'jsonwebtoken';
import config from '../config/index';

export const generateToken = (payload: any) =>
  //@ts-ignore
  jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

export const verifyToken = (token: string) =>
  jwt.verify(token, config.jwtSecret);
