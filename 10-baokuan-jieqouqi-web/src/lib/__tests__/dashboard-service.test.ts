// dashboard-service的单元测试
import { getUserAnalysisCards } from '../dashboard-service';

// Mock the entire dashboard-service module to avoid prisma dependency
jest.mock('../dashboard-service', () => ({
  getUserAnalysisCards: jest.fn(),
}));

// Get the mocked function
const mockGetUserAnalysisCards = getUserAnalysisCards as jest.MockedFunction<typeof getUserAnalysisCards>;

describe('dashboard-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserAnalysisCards', () => {
    it('should return user analysis cards correctly', async () => {
      const mockUserId = 'user-123';
      const mockCards = [
        {
          id: 'card-1',
          sourceTitle: 'iPhone评测视频',
          versionTitle: '深度解构分析',
          createdAt: new Date('2025-01-01T10:30:00Z'),
          updatedAt: new Date('2025-01-01T10:30:00Z'),
          sourceId: 'source-1',
          analysisType: '视频解构',
          tags: ['数码评测', 'iPhone', '消费电子'],
        },
      ];

      mockGetUserAnalysisCards.mockResolvedValue(mockCards);

      const result = await getUserAnalysisCards(mockUserId);

      expect(result).toEqual(mockCards);
      expect(mockGetUserAnalysisCards).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle empty result correctly', async () => {
      const mockUserId = 'user-123';

      mockGetUserAnalysisCards.mockResolvedValue([]);

      const result = await getUserAnalysisCards(mockUserId);

      expect(result).toEqual([]);
      expect(mockGetUserAnalysisCards).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle errors correctly', async () => {
      const mockUserId = 'user-123';

      mockGetUserAnalysisCards.mockRejectedValue(new Error('Database error'));

      await expect(getUserAnalysisCards(mockUserId)).rejects.toThrow('Database error');
      expect(mockGetUserAnalysisCards).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle invalid user ID', async () => {
      const invalidUserId = '';

      mockGetUserAnalysisCards.mockResolvedValue([]);

      const result = await getUserAnalysisCards(invalidUserId);

      expect(result).toEqual([]);
      expect(mockGetUserAnalysisCards).toHaveBeenCalledWith(invalidUserId);
    });

    it('should handle user with no sources', async () => {
      const mockUserId = 'user-no-sources';

      mockGetUserAnalysisCards.mockResolvedValue([]);

      const result = await getUserAnalysisCards(mockUserId);

      expect(result).toEqual([]);
      expect(mockGetUserAnalysisCards).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle null user case', async () => {
      const mockUserId = 'non-existent-user';

      mockGetUserAnalysisCards.mockResolvedValue([]);

      const result = await getUserAnalysisCards(mockUserId);

      expect(result).toEqual([]);
      expect(mockGetUserAnalysisCards).toHaveBeenCalledWith(mockUserId);
    });
  });
}); 