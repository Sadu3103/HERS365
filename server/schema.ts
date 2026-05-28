// @ts-nocheck - Drizzle ORM type compatibility
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const players = sqliteTable('players', {
  id: integer('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  name: text('name').notNull(),
  position: text('position'),
  age: integer('age'),
  state: text('state'),
  city: text('city'),
  zipCode: text('zip_code'),
  school: text('school'),
  gradYear: integer('grad_year'),
  g5Rating: integer('g5_rating'), // 1-5 stars
  nilPoints: integer('nil_points').default(0),
  xpPoints: integer('xp_points').default(0), // Progression points
  level: integer('level').default(1),
  archetype: text('archetype'),
  gpa: text('gpa'),
  collegeOffers: text('college_offers', { mode: 'json' }),
  verificationStatus: text('verification_status').default('unverified'),
  subscriptionTier: text('subscription_tier').default('free'),
  privacySetting: text('privacy_setting').default('public'),
  segment: text('segment').default('high_school'), // youth, high_school, college, elite
  skillTier: text('skill_tier').default('beginner'), // beginner, intermediate, advanced, elite
  isRecreational: integer('is_recreational', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const teams = sqliteTable('teams', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  logo: text('logo'),
  state: text('state'),
  city: text('city'),
  conference: text('conference'),
  division: text('division'), // NAIA, NJCAA, NCAA D1, etc.
  wins: integer('wins').default(0),
  losses: integer('losses').default(0),
  titles: integer('titles').default(0),
  rating: integer('rating').default(0),
  tuitionInState: integer('tuition_in_state'),
  tuitionOutState: integer('tuition_out_state'),
  hasApplication: integer('has_application', { mode: 'boolean' }).default(false),
  hasQuestionnaire: integer('has_questionnaire', { mode: 'boolean' }).default(false),
  applicationUrl: text('application_url'),
  questionnaireUrl: text('questionnaire_url'),
  socials: text('socials', { mode: 'json' }), // { instagram, twitter, facebook, youtube }
  type: text('type').default('college'), // college, high_school
});

export const combineStats = sqliteTable('combine_stats', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  season: text('season'),
  fortyDash: text('forty_dash'),
  shuttle: text('shuttle'),
  vertical: text('vertical'),
  broadJump: text('broad_jump'),
  threeCone: text('three_cone'),
});

export const gameStats = sqliteTable('game_stats', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  gameId: integer('game_id'),
  passingAttempts: integer('passing_attempts'),
  passingCompletions: integer('passing_completions'),
  passingYards: integer('passing_yards'),
  passingTds: integer('passing_tds'),
  interceptionsThrown: integer('interceptions_thrown'),
  longestPass: integer('longest_pass'),
  rushingAttempts: integer('rushing_attempts'),
  rushingYards: integer('rushing_yards'),
  rushingTds: integer('rushing_tds'),
  longestRun: integer('longest_run'),
  receptions: integer('receptions'),
  receivingYards: integer('receiving_yards'),
  receivingTds: integer('receiving_tds'),
  longestReception: integer('longest_reception'),
  flagPulls: integer('flag_pulls'),
  interceptionsCaught: integer('interceptions_caught'),
  passBreakups: integer('pass_breakups'),
  defensiveTds: integer('defensive_tds'),
});

export const badges = sqliteTable('badges', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  category: text('category'),
});

export const playerBadges = sqliteTable('player_badges', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  badgeId: integer('badge_id').references(() => badges.id),
  earnedAt: integer('earned_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const challenges = sqliteTable('challenges', {
  id: integer('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  points: integer('points'),
  type: text('type'),
});

export const playerChallenges = sqliteTable('player_challenges', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  challengeId: integer('challenge_id').references(() => challenges.id),
  progress: integer('progress').default(0),
  completed: integer('completed', { mode: 'boolean' }).default(false),
});

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  content: text('content'),
  mediaUrl: text('media_url'),
  mediaType: text('media_type'),
  category: text('category'), // training, game, combine
  moderationStatus: text('moderation_status').default('pending'), // pending, approved, flagged
  likes: integer('likes').default(0),
  comments: integer('comments').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const stories = sqliteTable('stories', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  imageUrl: text('image_url'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const nilActivities = sqliteTable('nil_activities', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  activityType: text('activity_type'),
  pointsEarned: integer('points_earned'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const nilOpportunities = sqliteTable('nil_opportunities', {
  id: integer('id').primaryKey(),
  brandName: text('brand_name'),
  requirements: text('requirements'),
  deliverables: text('deliverables'),
  estimatedEarnings: integer('estimated_earnings'),
});

export const dealApplications = sqliteTable('deal_applications', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  opportunityId: integer('opportunity_id').references(() => nilOpportunities.id),
  status: text('status'),
  aiMatchScore: integer('ai_match_score'),
});

export const dealTasks = sqliteTable('deal_tasks', {
  id: integer('id').primaryKey(),
  applicationId: integer('application_id').references(() => dealApplications.id),
  taskDescription: text('task_description'),
  completed: integer('completed', { mode: 'boolean' }).default(false),
});

export const earningsTracking = sqliteTable('earnings_tracking', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  applicationId: integer('application_id').references(() => dealApplications.id),
  amount: integer('amount'),
  status: text('status'),
});

export const teamNilCampaigns = sqliteTable('team_nil_campaigns', {
  id: integer('id').primaryKey(),
  teamId: integer('team_id').references(() => teams.id),
  campaignName: text('campaign_name'),
  totalPool: integer('total_pool'),
});

export const mentorshipConnections = sqliteTable('mentorship_connections', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  mentorName: text('mentor_name'),
  matchedAt: integer('matched_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const playerHighlights = sqliteTable('player_highlights', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  videoUrl: text('video_url'),
  thumbnailUrl: text('thumbnail_url'),
  category: text('category'),
  season: text('season'),
  annotations: text('annotations', { mode: 'json' }).default([]),
  clipSettings: text('clip_settings', { mode: 'json' }), // { start, end, originalVideoId }
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Parents table - for parent accounts who can manage their children's profiles and payments
export const parents = sqliteTable('parents', {
  id: integer('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Link between parents and their children (athletes)
export const parentChildRelations = sqliteTable('parent_child_relations', {
  id: integer('id').primaryKey(),
  parentId: integer('parent_id').references(() => parents.id),
  playerId: integer('player_id').references(() => players.id),
  relationship: text('relationship'), // 'mother', 'father', 'guardian', etc.
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const coaches = sqliteTable('coaches', {
  id: integer('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  name: text('name'),
  university: text('university'),
  division: text('division'),
  recruitingPositions: text('recruiting_positions'),
  recruitingStates: text('recruiting_states'),
  verifiedStatus: integer('verified_status', { mode: 'boolean' }).default(false),
});

export const adminUsers = sqliteTable('admin_users', {
  id: integer('id').primaryKey(),
  username: text('username').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role'),
});

export const subscriptionPlans = sqliteTable('subscription_plans', {
  id: integer('id').primaryKey(),
  name: text('name'),
  price: integer('price'), // in cents
  tierLevel: text('tier_level'),
});

export const playerSubscriptions = sqliteTable('player_subscriptions', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  planId: integer('plan_id').references(() => subscriptionPlans.id),
  status: text('status'),
  stripeSubscriptionId: text('stripe_subscription_id'),
});

export const schedules = sqliteTable('schedules', {
  id: integer('id').primaryKey(),
  teamId: integer('team_id').references(() => teams.id),
  opponentName: text('opponent_name'),
  date: text('date'),
  result: text('result'),
});

export const follows = sqliteTable('follows', {
  id: integer('id').primaryKey(),
  followerId: integer('follower_id').references(() => players.id),
  followingId: integer('following_id').references(() => players.id),
});

export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey(),
  postId: integer('post_id').references(() => posts.id),
  playerId: integer('player_id').references(() => players.id),
  content: text('content'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  type: text('type'), // like, comment, follow, mention, coach_interest
  actorName: text('actor_name'),
  read: integer('read', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const aiBots = sqliteTable('ai_bots', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  botName: text('bot_name'),
  personality: text('personality'),
  interactionCount: integer('interaction_count').default(0),
});

export const botConversations = sqliteTable('bot_conversations', {
  id: integer('id').primaryKey(),
  botId: integer('bot_id').references(() => aiBots.id),
  role: text('role'), // 'user' | 'assistant'
  content: text('content'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const trainingPlans = sqliteTable('training_plans', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  weeklySchedule: text('weekly_schedule'),
  goals: text('goals'),
});

export const drills = sqliteTable('drills', {
  id: integer('id').primaryKey(),
  position: text('position'),
  category: text('category'),
  instructions: text('instructions'),
});

export const skillChallengeCompletions = sqliteTable('skill_challenge_completions', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  drillId: integer('drill_id').references(() => drills.id),
  aiFeedback: text('ai_feedback'),
  score: integer('score'),
});

export const coachFeedback = sqliteTable('coach_feedback', {
  id: integer('id').primaryKey(),
  coachId: integer('coach_id').references(() => coaches.id),
  playerId: integer('player_id').references(() => players.id),
  skillRatings: text('skill_ratings'),
  notes: text('notes'),
});

export const events = sqliteTable('events', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  date: text('date').notNull(),
  location: text('location').notNull(),
  registrationDeadline: text('registration_deadline'),
  participantCount: integer('participant_count').default(0),
  capacity: integer('capacity').default(0),
  price: integer('price').default(0), // in cents
  description: text('description'),
  upcoming: integer('upcoming', { mode: 'boolean' }).default(true),
});

export const eventRegistrations = sqliteTable('event_registrations', {
  id: integer('id').primaryKey(),
  eventId: integer('event_id').references(() => events.id),
  playerId: integer('player_id').references(() => players.id),
  checkedIn: integer('checked_in', { mode: 'boolean' }).default(false),
});

export const eventLeaderboards = sqliteTable('event_leaderboards', {
  id: integer('id').primaryKey(),
  eventId: integer('event_id').references(() => events.id),
  playerId: integer('player_id').references(() => players.id),
  rank: integer('rank'),
  performanceMetrics: text('performance_metrics'),
});

export const brandPartnerships = sqliteTable('brand_partnerships', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  opportunityId: integer('opportunity_id').references(() => nilOpportunities.id),
  status: text('status'), // active, completed
});

// ----------------------
// PAYMENTS - Track kid payments
// ----------------------
export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  amount: integer('amount').notNull(), // in cents
  currency: text('currency').default('usd'),
  status: text('status').default('pending'), // pending, completed, failed, refunded
  paymentMethod: text('payment_method'), // card, paypal, stripe, cash, check
  paymentType: text('payment_type'), // subscription, one_time, tournament_fee, equipment, training
  description: text('description'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  stripeCustomerId: text('stripe_customer_id'),
  receiptUrl: text('receipt_url'),
  parentName: text('parent_name'),
  parentEmail: text('parent_email'),
  parentPhone: text('parent_phone'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  paidAt: text('paid_at'),
});

export const paymentMethods = sqliteTable('payment_methods', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  type: text('type').notNull(), // card, paypal, bank_account
  last4: text('last4'),
  brand: text('brand'), // visa, mastercard, etc.
  expiryMonth: integer('expiry_month'),
  expiryYear: integer('expiry_year'),
  stripePaymentMethodId: text('stripe_payment_method_id'),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const invoices = sqliteTable('invoices', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  invoiceNumber: text('invoice_number').notNull(),
  amount: integer('amount').notNull(),
  tax: integer('tax').default(0),
  total: integer('total').notNull(),
  status: text('status').default('draft'), // draft, sent, paid, void
  dueDate: text('due_date'),
  paidAt: text('paid_at'),
  description: text('description'),
  lineItems: text('line_items'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});
export const messageRequests = sqliteTable('message_requests', {
  id: integer('id').primaryKey(),
  athleteId: integer('athlete_id').references(() => players.id),
  receiverId: integer('receiver_id'), // Coach or College ID
  content: text('content').notNull(),
  status: text('status').default('pending'), // pending, approved, rejected, sent
  parentId: integer('parent_id').references(() => parents.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const athleteRankings = sqliteTable('athlete_rankings', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id).unique(),
  nationalRank: integer('national_rank'),
  stateRank: integer('state_rank'),
  positionRank: integer('position_rank'),
  percentile: integer('percentile'),
  movement: text('movement'), // up, down, same
  // Overall scores
  overallScore: real('overall_score'),
  // Individual source scores
  combineScore: real('combine_score'),
  maxPrepsScore: real('max_preps_score'),
  zybekScore: real('zybek_score'),
  usaTalentIdScore: real('usa_talent_id_score'),
  // Data source tracking
  dataSources: text('data_sources'),
  // Last update from each source
  maxPrepsLastUpdate: text('max_preps_last_update'),
  zybekLastUpdate: text('zybek_last_update'),
  usaTalentIdLastUpdate: text('usa_talent_id_last_update'),
  combineLastUpdate: text('combine_last_update'),
  // Verification status
  maxPrepsVerified: integer('max_preps_verified', { mode: 'boolean' }).default(false),
  zybekVerified: integer('zybek_verified', { mode: 'boolean' }).default(false),
  usaTalentIdVerified: integer('usa_talent_id_verified', { mode: 'boolean' }).default(false),
  combineVerified: integer('combine_verified', { mode: 'boolean' }).default(false),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const coachProspects = sqliteTable('coach_prospects', {
  id: integer('id').primaryKey(),
  coachId: integer('coach_id').references(() => coaches.id),
  athleteId: integer('athlete_id').references(() => players.id),
  tier: text('tier').default('watching'), // target, watching, offered
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey(),
  coachId: integer('coach_id').references(() => coaches.id),
  athleteId: integer('athlete_id').references(() => players.id),
  senderId: integer('sender_id'), // coach or athlete id
  senderType: text('sender_type'), // 'coach' or 'athlete'
  content: text('content').notNull(),
  read: integer('read', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const scholarships = sqliteTable('scholarships', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  amount: integer('amount').notNull(),
  deadline: text('deadline').notNull(),
  requirements: text('requirements'),
  category: text('category'),
  eligibleStates: text('eligible_states'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const savedScholarships = sqliteTable('saved_scholarships', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  scholarshipId: integer('scholarship_id').references(() => scholarships.id),
  savedAt: text('saved_at').default(sql`CURRENT_TIMESTAMP`),
});
export const faqs = sqliteTable('faqs', {
  id: integer('id').primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  category: text('category').default('General'),
  isPublic: integer('is_public', { mode: 'boolean' }).default(true),
  askedCount: integer('asked_count').default(1),
  lastAskedAt: text('last_asked_at').default(sql`CURRENT_TIMESTAMP`),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// ──────────────────────────────────────────────────────────────────────────────
// EVENT-DRIVEN MICROSERVICES SCHEMA
// ──────────────────────────────────────────────────────────────────────────────

// Event store for reliability and idempotency
export const eventStore = sqliteTable('event_store', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  aggregateId: text('aggregate_id').notNull(),
  aggregateType: text('aggregate_type').notNull(),
  timestamp: text('timestamp').notNull(),
  correlationId: text('correlation_id').notNull(),
  causationId: text('causation_id'),
  userId: text('user_id'),
  userType: text('user_type'),
  source: text('source').notNull(),
  version: integer('version').notNull(),
  metadata: text('metadata').notNull(), // JSON string
  payload: text('payload').notNull(), // JSON string
  processed: integer('processed', { mode: 'boolean' }).default(false),
  processedAt: text('processed_at'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  deadLetter: integer('dead_letter', { mode: 'boolean' }).default(false),
  deadLetterReason: text('dead_letter_reason'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Saga state management for complex transactions
export const sagaInstances = sqliteTable('saga_instances', {
  id: text('id').primaryKey(),
  sagaType: text('saga_type').notNull(),
  correlationId: text('correlation_id').notNull(),
  aggregateId: text('aggregate_id').notNull(),
  aggregateType: text('aggregate_type').notNull(),
  status: text('status').notNull(), // 'pending', 'completed', 'failed', 'compensating'
  currentStep: text('current_step'),
  stepsCompleted: text('steps_completed').notNull(), // JSON array
  compensating: integer('compensating', { mode: 'boolean' }).default(false),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  errorMessage: text('error_message'),
  metadata: text('metadata'), // JSON additional context
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Service health and circuit breaker state
export const serviceHealth = sqliteTable('service_health', {
  id: text('id').primaryKey(),
  serviceName: text('service_name').notNull(),
  serviceId: text('service_id').notNull(),
  status: text('status').notNull(), // 'healthy', 'degraded', 'unhealthy'
  lastHealthCheck: text('last_health_check').default(sql`CURRENT_TIMESTAMP`),
  consecutiveFailures: integer('consecutive_failures').default(0),
  totalRequests: integer('total_requests').default(0),
  failedRequests: integer('failed_requests').default(0),
  averageResponseTime: real('average_response_time'),
  circuitBreakerState: text('circuit_breaker_state').default('closed'), // 'closed', 'open', 'half_open'
  lastFailureAt: text('last_failure_at'),
  metadata: text('metadata'), // JSON health check details
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Idempotency keys for API requests
export const idempotencyKeys = sqliteTable('idempotency_keys', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  requestHash: text('request_hash').notNull(),
  responseData: text('response_data'),
  status: text('status').notNull(), // 'processing', 'completed', 'failed'
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  completedAt: text('completed_at'),
});

// Service discovery and registration
export const serviceRegistry = sqliteTable('service_registry', {
  id: text('id').primaryKey(),
  serviceName: text('service_name').notNull(),
  serviceId: text('service_id').notNull().unique(),
  host: text('host').notNull(),
  port: integer('port').notNull(),
  protocol: text('protocol').default('http'),
  healthEndpoint: text('health_endpoint').default('/health'),
  status: text('status').default('starting'), // 'starting', 'healthy', 'unhealthy', 'stopped'
  lastHeartbeat: text('last_heartbeat').default(sql`CURRENT_TIMESTAMP`),
  metadata: text('metadata'), // JSON service capabilities
  tags: text('tags'), // JSON tags for service discovery
  registeredAt: text('registered_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Distributed locks for leader election and coordination
export const distributedLocks = sqliteTable('distributed_locks', {
  id: text('id').primaryKey(),
  lockKey: text('lock_key').notNull().unique(),
  ownerId: text('owner_id').notNull(),
  ttl: integer('ttl').notNull(), // Time to live in seconds
  acquiredAt: text('acquired_at').default(sql`CURRENT_TIMESTAMP`),
  metadata: text('metadata'), // JSON lock context
});

// Outbox pattern for reliable event publishing
export const eventOutbox = sqliteTable('event_outbox', {
  id: integer('id').primaryKey(),
  eventId: text('event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  aggregateId: text('aggregate_id').notNull(),
  payload: text('payload').notNull(), // JSON
  metadata: text('metadata').notNull(), // JSON
  published: integer('published', { mode: 'boolean' }).default(false),
  publishedAt: text('published_at'),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(5),
  errorMessage: text('error_message'),
  nextRetryAt: text('next_retry_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Inbox pattern for reliable event consumption
export const eventInbox = sqliteTable('event_inbox', {
  id: integer('id').primaryKey(),
  eventId: text('event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  aggregateId: text('aggregate_id').notNull(),
  payload: text('payload').notNull(), // JSON
  metadata: text('metadata').notNull(), // JSON
  processed: integer('processed', { mode: 'boolean' }).default(false),
  processedAt: text('processed_at'),
  processingId: text('processing_id'), // UUID for concurrent processing
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  errorMessage: text('error_message'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Command store for CQRS pattern
export const commandStore = sqliteTable('command_store', {
  id: text('id').primaryKey(),
  commandType: text('command_type').notNull(),
  aggregateId: text('aggregate_id').notNull(),
  aggregateType: text('aggregate_type').notNull(),
  payload: text('payload').notNull(), // JSON
  metadata: text('metadata').notNull(), // JSON
  executed: integer('executed', { mode: 'boolean' }).default(false),
  executedAt: text('executed_at'),
  result: text('result'), // JSON
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const supportInteractions = sqliteTable('support_interactions', {
  id: integer('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  question: text('question').notNull(),
  aiResponse: text('ai_response').notNull(),
  wasHelpful: integer('was_helpful', { mode: 'boolean' }).default(true),
  tags: text('tags'), // Array of keywords
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// ──────────────────────────────────────────────────────────────────────────────
// SECURE AUTHENTICATION SYSTEM SCHEMA
// ──────────────────────────────────────────────────────────────────────────────

// Refresh tokens for JWT rotation security
export const refreshTokens = sqliteTable('refresh_tokens', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull(), // Can reference players, parents, coaches, or admin_users
  userType: text('user_type').notNull(), // 'athlete', 'parent', 'coach', 'admin'
  tokenHash: text('token_hash').notNull().unique(), // Hashed refresh token
  deviceFingerprint: text('device_fingerprint'), // Browser/device identifier
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  isRevoked: integer('is_revoked', { mode: 'boolean' }).default(false),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }),
  revokedReason: text('revoked_reason'), // 'user_logout', 'suspicious_activity', 'admin_action'
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
});

// MFA secrets and backup codes
export const mfaSecrets = sqliteTable('mfa_secrets', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull(),
  userType: text('user_type').notNull(), // 'athlete', 'parent', 'coach', 'admin'
  secret: text('secret').notNull(), // TOTP secret key (encrypted)
  backupCodes: text('backup_codes').notNull(), // JSON array of hashed backup codes
  isEnabled: integer('is_enabled', { mode: 'boolean' }).default(false),
  verifiedAt: integer('verified_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Active user sessions for management and revocation
export const userSessions = sqliteTable('user_sessions', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull(),
  userType: text('user_type').notNull(),
  sessionId: text('session_id').notNull().unique(), // UUID for session tracking
  refreshTokenId: integer('refresh_token_id').references(() => refreshTokens.id),
  deviceFingerprint: text('device_fingerprint'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  location: text('location'), // Geolocation data
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Failed login attempts tracking for brute force protection
export const failedLoginAttempts = sqliteTable('failed_login_attempts', {
  id: integer('id').primaryKey(),
  email: text('email').notNull(),
  userType: text('user_type').notNull(), // 'athlete', 'parent', 'coach', 'admin'
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent'),
  attemptedAt: integer('attempted_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  failureReason: text('failure_reason'), // 'invalid_password', 'account_locked', 'mfa_failed'
});

// Account lockout tracking
export const accountLockouts = sqliteTable('account_lockouts', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull(),
  userType: text('user_type').notNull(),
  email: text('email').notNull(),
  lockoutReason: text('lockout_reason').notNull(), // 'brute_force', 'suspicious_activity', 'admin_lock'
  lockedAt: integer('locked_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  unlockAt: integer('unlock_at', { mode: 'timestamp' }),
  isPermanent: integer('is_permanent', { mode: 'boolean' }).default(false),
  unlockedBy: text('unlocked_by'), // 'auto', 'admin', 'user_reset'
  unlockedAt: integer('unlocked_at', { mode: 'timestamp' }),
});

// Security audit logs for compliance and monitoring
export const securityAuditLogs = sqliteTable('security_audit_logs', {
  id: integer('id').primaryKey(),
  userId: integer('user_id'),
  userType: text('user_type'),
  action: text('action').notNull(), // 'login', 'logout', 'token_refresh', 'mfa_setup', 'password_change'
  resource: text('resource'), // What was accessed/modified
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  location: text('location'),
  success: integer('success', { mode: 'boolean' }).default(true),
  errorMessage: text('error_message'),
  metadata: text('metadata'), // JSON additional context
  complianceFlags: text('compliance_flags'), // 'coppa', 'gdpr', 'ferpa', 'pci'
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Device trust scores for risk assessment
export const deviceTrustScores = sqliteTable('device_trust_scores', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull(),
  userType: text('user_type').notNull(),
  deviceFingerprint: text('device_fingerprint').notNull(),
  trustScore: integer('trust_score').default(50), // 0-100 scale
  factors: text('factors'), // JSON array of trust factors
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  consecutiveFailures: integer('consecutive_failures').default(0),
  requiresMfa: integer('requires_mfa', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Suspicious activity alerts
export const securityAlerts = sqliteTable('security_alerts', {
  id: integer('id').primaryKey(),
  userId: integer('user_id'),
  userType: text('user_type'),
  alertType: text('alert_type').notNull(), // 'brute_force_attempt', 'unusual_location', 'multiple_devices'
  severity: text('severity').notNull(), // 'low', 'medium', 'high', 'critical'
  description: text('description').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  location: text('location'),
  metadata: text('metadata'), // JSON additional context
  resolved: integer('resolved', { mode: 'boolean' }).default(false),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
  resolvedBy: text('resolved_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

