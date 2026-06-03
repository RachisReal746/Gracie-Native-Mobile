const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const supabase = require('./supabaseClient');
const emailService = require('./emailService');

class AuthService {

  generateToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
  }

  generateVerificationToken() {
    return uuidv4();
  }

  // ================= REGISTER =================
  async register(name, email, password, legalConsent = false, phoneNumber = null) {
    try {

      const normalizedEmail = email.toLowerCase();

      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      if (!legalConsent) {
        throw new Error('Legal consent is required to use this service');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Token for verification
      const verificationToken = this.generateVerificationToken();

      // Create user
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          name,
          email: normalizedEmail,
          password_hash: passwordHash,
          legal_consent: true,
          legal_consent_timestamp: new Date().toISOString(),
          email_verification_token: verificationToken,
          phone_number: phoneNumber
        })
        .select()
        .single();

      if (error) throw error;

      // Create progress row
      await supabase
        .from('user_progress')
        .insert({ user_id: newUser.id });

      // 🔴 IMPORTANT FIX: DO NOT BLOCK SIGNUP WITH EMAIL
      setImmediate(async () => {
        try {
          await emailService.sendWelcomeEmailWithVerification(
            newUser.email,
            newUser.name,
            verificationToken
          );
        } catch (err) {
          console.error("Welcome email failed:", err.message);
        }

        try {
          await emailService.sendConsentNotificationToAdmin(
            newUser.email,
            newUser.name,
            newUser.legal_consent_timestamp
          );
        } catch (err) {
          console.error("Admin email failed:", err.message);
        }
      });

      const token = this.generateToken(newUser.id);

      return {
        success: true,
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          email_verified: newUser.email_verified,
          is_premium: newUser.is_premium,
          sobriety_start_date: newUser.sobriety_start_date
        }
      };

    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // ================= LOGIN =================
  async login(email, password) {
    try {
      const normalizedEmail = email.toLowerCase();

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalizedEmail)
        .single();

      if (error || !user) {
        throw new Error('Invalid email or password');
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      const token = this.generateToken(user.id);

      return {
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          email_verified: user.email_verified,
          is_premium: user.is_premium,
          sobriety_start_date: user.sobriety_start_date
        }
      };

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // ================= VERIFY EMAIL =================
  async verifyEmail(token) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('email_verification_token', token)
        .single();

      if (error || !user) {
        throw new Error('Invalid or expired verification token');
      }

      await supabase
        .from('users')
        .update({
          email_verified: true,
          email_verification_token: null
        })
        .eq('id', user.id);

      return { success: true };

    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  // ================= CURRENT USER =================
  async getCurrentUser(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, email_verified, is_premium, sobriety_start_date, created_at')
        .eq('id', decoded.userId)
        .single();

      if (error || !user) {
        throw new Error('User not found');
      }

      return user;

    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();