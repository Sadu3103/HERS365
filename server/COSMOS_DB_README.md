# COSMOS DB SCHEMA & PERFORMANCE OPTIMIZATION

## Overview

This implementation provides an enterprise-grade Cosmos DB schema optimized for a high-traffic social recruiting platform. The design ensures **sub-200ms latency** at scale while maintaining strict compliance with COPPA, FERPA, and GDPR regulations.

## Architecture Components

### 🗄️ **Cosmos DB Container Design**

#### **Partition Key Strategy**
- **Synthetic Keys**: Evenly distribute data across 400 partitions
- **Time-Based Partitioning**: Optimize for temporal queries
- **Composite Partitioning**: Multi-dimensional data distribution

#### **Indexing Strategy**
- **Automatic Indexing**: Cosmos DB's automatic indexing with custom overrides
- **Composite Indexes**: Multi-property query optimization
- **Spatial Indexes**: Location-based athlete/coach matching

### 📊 **Query Performance Optimization**

#### **Point Reads** (< 10ms target)
```sql
-- User profile lookup
SELECT * FROM c WHERE c.userId = @userId

-- Message retrieval
SELECT * FROM c WHERE c.conversationId = @conversationId
```

#### **Partition-Optimized Queries** (< 50ms target)
```sql
-- User's posts feed
SELECT * FROM c
WHERE c.authorId = @authorId AND c.createdAt < @beforeDate
ORDER BY c.createdAt DESC

-- Conversation messages
SELECT * FROM c
WHERE c.conversationId = @conversationId
ORDER BY c.createdAt ASC
```

#### **Cross-Partition Queries** (< 200ms target)
```sql
-- Global search with filters
SELECT * FROM c
WHERE c.entityType = 'athlete'
  AND c.filters.state = @state
  AND c.ranking.overallScore >= @minScore
ORDER BY c.ranking.overallScore DESC
```

## 🚀 **Performance Targets & Benchmarks**

### **Latency Requirements**
| Operation | Target | Cosmos DB | With Cache |
|-----------|--------|-----------|------------|
| User Lookup | < 10ms | 5-15ms | 1-5ms |
| Feed Load | < 50ms | 20-40ms | 5-15ms |
| Search Query | < 200ms | 50-150ms | 10-50ms |
| Message Send | < 100ms | 30-70ms | 5-20ms |

### **Throughput Optimization**
- **RU/s Allocation**: 50,000-100,000 RU/s per high-traffic container
- **Request Distribution**: Even partition utilization (> 90%)
- **Cache Hit Rate**: > 95% for frequently accessed data
- **Concurrent Users**: 50,000+ active users supported

## 🗂️ **Container Schema Details**

### **Users Container**
```json
{
  "id": "uuid",
  "partitionKey": "user_045", // Synthetic key for even distribution
  "userId": "athlete_123",
  "email": "athlete@example.com",
  "userType": "athlete",
  "verificationStatus": "verified",
  "profile": {
    "avatar": "url",
    "bio": "text",
    "location": { "city": "LA", "state": "CA" }
  },
  "preferences": {
    "notifications": { "email": true, "push": true },
    "privacy": { "profileVisibility": "public" }
  },
  "complianceData": {
    "parentalConsent": true,
    "ageVerification": true,
    "coppaCompliant": true
  },
  "lastLoginAt": "2024-01-15T10:30:00Z",
  "loginCount": 42,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Partition Key**: `partitionKey` (synthetic hash-based)
**Indexing**: Composite index on `(userType, email)` and `(userType, verificationStatus)`

### **Posts Container**
```json
{
  "id": "uuid",
  "partitionKey": "post_20240115_045", // Time + hash based
  "postId": "post_456",
  "authorId": "athlete_123",
  "content": "Excited for the upcoming season! #football #recruiting",
  "postType": "text",
  "visibility": "public",
  "hashtags": ["football", "recruiting"],
  "mentions": ["coach_789"],
  "location": {
    "name": "Rose Bowl",
    "coordinates": [-118.167, 34.161]
  },
  "engagement": {
    "likes": 42,
    "comments": 7,
    "shares": 3,
    "views": 156
  },
  "complianceFlags": ["coppa"],
  "moderationStatus": "approved",
  "createdAt": "2024-01-15T14:30:00Z",
  "updatedAt": "2024-01-15T14:30:00Z"
}
```

**Partition Key**: `partitionKey` (time + hash based)
**Indexing**: Composite indexes for feed queries and hashtag searches

### **Messages Container**
```json
{
  "id": "uuid",
  "partitionKey": "msg_089", // Conversation-based
  "messageId": "msg_789",
  "conversationId": "conv_athlete123_coach456",
  "senderId": "athlete_123",
  "recipientId": "coach_456",
  "messageType": "recruitment",
  "content": "Coach, I'd love to discuss scholarship opportunities",
  "status": "sent",
  "attachments": [{
    "id": "file_001",
    "type": "video",
    "url": "https://...",
    "size": 15432000
  }],
  "complianceFlags": ["ferpa"],
  "readAt": null,
  "createdAt": "2024-01-15T15:45:00Z",
  "updatedAt": "2024-01-15T15:45:00Z"
}
```

**Partition Key**: `partitionKey` (conversation hash-based)
**Indexing**: Optimized for conversation threads and inbox queries

### **Search Index Container**
```json
{
  "id": "uuid",
  "partitionKey": "search_067", // Hash-based distribution
  "entityType": "athlete",
  "entityId": "athlete_123",
  "searchTerms": ["john", "doe", "quarterback", "texas"],
  "filters": {
    "sport": "football",
    "state": "TX",
    "graduationYear": 2025,
    "gpa": 3.8,
    "position": "QB"
  },
  "ranking": {
    "overallScore": 8.7,
    "athleticScore": 9.2,
    "academicScore": 8.1,
    "recruitmentScore": 8.9
  },
  "lastUpdated": "2024-01-15T16:00:00Z"
}
```

**Partition Key**: `partitionKey` (entity hash-based)
**Indexing**: Multi-dimensional search optimization

### **Audit Logs Container**
```json
{
  "id": "uuid",
  "partitionKey": "audit_20240115_034", // Date-based
  "action": "user_login",
  "resource": "authentication",
  "userId": "athlete_123",
  "userType": "athlete",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "success": true,
  "errorMessage": null,
  "metadata": {
    "deviceFingerprint": "abc123",
    "mfaUsed": true,
    "sessionId": "sess_456"
  },
  "complianceFlags": ["gdpr", "coppa"],
  "severity": "low",
  "timestamp": "2024-01-15T16:15:00Z"
}
```

**Partition Key**: `partitionKey` (date + hash based)
**Indexing**: Compliance and security event queries
**TTL**: 7 years retention (FERPA compliance)

## ⚡ **Caching Strategy**

### **Multi-Level Caching Architecture**

#### **L1: Application Cache** (Redis)
```typescript
// User data: 5-minute TTL
const user = await cache.get(`user:${userId}`);

// Post feeds: 10-minute TTL
const posts = await cache.get(`user_posts:${userId}:${page}`);

// Search results: 30-minute TTL
const results = await cache.get(`search:${filtersHash}`);
```

#### **L2: Cosmos DB Cache** (Built-in)
- **Query Result Caching**: Automatic caching of frequent queries
- **Materialized Views**: Pre-computed aggregations
- **Change Feed**: Real-time cache invalidation

#### **L3: CDN Cache** (Azure Front Door)
- **Static Assets**: Profile images, videos
- **Public Content**: Non-personalized feeds
- **API Responses**: Cacheable GET responses

### **Cache Invalidation Strategy**
```typescript
// Write-through caching
await db.update(userData);
await cache.set(`user:${userId}`, userData, 300);

// Invalidate related caches
await cache.invalidate(`user_posts:${userId}:*`);
await cache.invalidate(`user_search:${userId}`);
```

## 🔍 **Query Optimization Patterns**

### **1. Point Reads (Fastest)**
```javascript
// Direct lookup by partition key + id
const user = await container.item(userId, partitionKey).read();
```

### **2. Partition-Scoped Queries**
```sql
-- Single partition, indexed properties
SELECT * FROM c
WHERE c.partitionKey = 'user_045'
  AND c.userType = 'athlete'
  AND c.verificationStatus = 'verified'
ORDER BY c.createdAt DESC
```

### **3. Cross-Partition Queries (Use Sparingly)**
```sql
-- Global search - higher RU cost
SELECT * FROM c
WHERE c.entityType = 'athlete'
  AND c.filters.state = 'TX'
  AND c.ranking.overallScore > 8.0
ORDER BY c.ranking.overallScore DESC
OFFSET 0 LIMIT 20
```

### **4. Aggregation Queries**
```sql
-- Use stored procedures for complex aggregations
SELECT COUNT(1) as total,
       AVG(c.ranking.overallScore) as avgScore
FROM c
WHERE c.entityType = 'athlete'
  AND c.filters.state = @state
```

## 📈 **Scaling & Performance Monitoring**

### **RU Consumption Monitoring**
```javascript
// Monitor RU consumption per operation
const { resources, requestCharge } = await container.items.query(query, {
  populateQuotaInfo: true
});

console.log(`Query consumed ${requestCharge} RU`);
```

### **Partition Balance Monitoring**
```javascript
// Check partition key distribution
const partitionStats = await container.read({
  populatePartitionStatistics: true
});

// Alert if any partition exceeds 10GB or has high RU usage
```

### **Performance Metrics Dashboard**
- **P50/P95/P99 Latency** per operation type
- **Cache Hit Rates** (> 95% target)
- **RU Utilization** per container
- **Throttle Rate** (< 1% target)
- **Cross-Partition Query Frequency**

## 🛡️ **Compliance & Security**

### **Data Residency & Sovereignty**
- **Regional Deployments**: Data stored in appropriate regions
- **GDPR Compliance**: Data minimization, right to erasure
- **COPPA Compliance**: Parental consent, age verification
- **FERPA Compliance**: Educational record protection

### **Audit & Monitoring**
- **Immutable Audit Trail**: All data access logged
- **Real-time Compliance Monitoring**: Automated violation detection
- **Data Encryption**: At rest and in transit
- **Access Controls**: RBAC with least privilege

## 🚀 **Deployment & Operations**

### **Infrastructure as Code**
```yaml
# Azure Resource Manager template
resources:
  - type: Microsoft.DocumentDB/databaseAccounts
    name: hers365-cosmos
    properties:
      locations:
        - locationName: 'East US'
          failoverPriority: 0
        - locationName: 'West US'
          failoverPriority: 1
      databaseAccountOfferType: 'Standard'
      enableAutomaticFailover: true
      enableMultipleWriteLocations: true
```

### **RU/s Auto-Scaling**
```javascript
// Enable autoscale for containers
await container.replace({
  throughput: {
    maxThroughput: 10000,
    autoUpgradePolicy: {
      throughputPolicy: {
        incrementPercent: 10
      }
    }
  }
});
```

### **Backup & Disaster Recovery**
- **Continuous Backup**: Point-in-time restore capability
- **Geo-Redundancy**: Multi-region replication
- **Failover Testing**: Regular DR drills
- **Data Archiving**: Long-term retention for compliance

## 📊 **Cost Optimization**

### **RU/s Allocation Strategy**
- **Burstable Containers**: Use shared RU/s for low-traffic containers
- **Dedicated RU/s**: High-traffic containers get dedicated throughput
- **Time-Based Scaling**: Scale down during off-peak hours

### **Storage Optimization**
- **TTL Policies**: Automatic data expiration
- **Compression**: Built-in data compression
- **Archival**: Move old data to cheaper storage tiers

### **Query Optimization**
- **Avoid Cross-Partition Queries**: Design for partition-local queries
- **Use Continuation Tokens**: Efficient pagination
- **Batch Operations**: Reduce round trips
- **Stored Procedures**: Complex operations in database

## 🎯 **Migration Strategy**

### **From Relational Database**
1. **Schema Analysis**: Map tables to containers
2. **Data Migration**: Use Azure Data Factory or custom scripts
3. **Query Refactoring**: Update application queries for Cosmos DB
4. **Performance Testing**: Validate latency and throughput targets
5. **Gradual Cutover**: Blue-green deployment strategy

### **Performance Validation**
```javascript
// Load testing script
const results = await loadTest({
  operations: [
    { name: 'user_lookup', weight: 40 },
    { name: 'feed_load', weight: 30 },
    { name: 'search_query', weight: 20 },
    { name: 'message_send', weight: 10 }
  ],
  targetRPS: 1000,
  duration: 300 // 5 minutes
});

console.log(`P95 Latency: ${results.p95}ms`);
console.log(`Success Rate: ${results.successRate}%`);
```

This Cosmos DB schema design provides the foundation for a high-performance, scalable social recruiting platform that can handle enterprise-scale traffic while maintaining sub-200ms latency and strict compliance requirements.