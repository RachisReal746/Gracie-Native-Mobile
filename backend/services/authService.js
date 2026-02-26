const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const supabase = require('./supabaseClient');
const emailService = require('./emailService');

class AuthService {
  // Generate JWT token
  generateToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
  }

  // Generate random token for email verification
  generateVerificationToken() {
    return uuidv4();
  }

  // Register new user
  async register(name, email, password, legalConsent = false, phoneNumber = null) {
    try {
      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Validate legal consent
      if (!legalConsent) {
        throw new Error('Legal consent is required to use this service');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Generate email verification token
      const verificationToken = this.generateVerificationToken();

      // Create user
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          name,
          email: email.toLowerCase(),
          password_hash: passwordHash,
          legal_consent: legalConsent,
          legal_consent_timestamp: new Date().toISOString(),
          email_verification_token: verificationToken,
          phone_number: phoneNumber
        })
        .select()
        .single();

      if (error) throw error;

      // Create user progress record
      await supabase
        .from('user_progress')
        .insert({ user_id: newUser.id });

 // Send combined welcome + verification email
      await emailService.sendWelcomeEmailWithVerification(
        newUser.email, 
        newUser.name, 
        verificationToken
      );

      // Send consent notification to admin
      await emailService.sendConsentNotificationToAdmin(
        newUser.email,
        newUser.name,
        newUser.legal_consent_timestamp
      );

      // Generate token
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

  // Login user
  async login(email, password) {
    try {
      // Find user
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (error || !user) {
        throw new Error('Invalid email or password');
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Generate token
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

  // Verify email
  async verifyEmail(token) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email')
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

      return { success: true, message: 'Email verified successfully' };
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  // Request password reset
  async requestPasswordReset(email) {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('email', email.toLowerCase())
        .single();

      if (!user) {
        // Don't reveal if email exists
        return { success: true, message: 'If email exists, reset link sent' };
      }

      const resetToken = this.generateVerificationToken();
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      await supabase
        .from('users')
        .update({
          password_reset_token: resetToken,
          password_reset_expires: resetExpires.toISOString()
        })
        .eq('id', user.id);

      await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);

      return { success: true, message: 'Password reset link sent to email' };
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }

  // Reset password
  async resetPassword(token, newPassword) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('password_reset_token', token)
        .gt('password_reset_expires', new Date().toISOString())
        .single();

      if (error || !user) {
        throw new Error('Invalid or expired reset token');
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          password_reset_token: null,
          password_reset_expires: null
        })
        .eq('id', user.id);

      return { success: true, message: 'Password reset successful' };
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  // Get current user by token
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
