import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { getHighFrequencyIndicators } from '../../../src/fred/search.js';

describe('High Frequency Indicators', () => {
  // Store the original fetch
  const originalFetch = global.fetch;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Restore the original fetch
    global.fetch = originalFetch;
  });

  it('should fetch top high frequency indicators with default limit', async () => {
    // Mock responses for daily and weekly searches
    const mockDailyResponse = {
      realtime_start: "2025-01-01",
      realtime_end: "2025-01-01",
      order_by: "popularity",
      sort_order: "desc",
      count: 100,
      offset: 0,
      limit: 50,
      seriess: [
        {
          id: "DAILY1",
          realtime_start: "2025-01-01",
          realtime_end: "2025-01-01",
          title: "Daily Indicator 1",
          observation_start: "2020-01-01",
          observation_end: "2025-01-01",
          frequency: "Daily",
          frequency_short: "D",
          units: "Percent",
          units_short: "%",
          seasonal_adjustment: "Not Seasonally Adjusted",
          seasonal_adjustment_short: "NSA",
          last_updated: "2025-01-01",
          popularity: 95,
          notes: "Daily economic indicator"
        }
      ]
    };

    const mockWeeklyResponse = {
      realtime_start: "2025-01-01",
      realtime_end: "2025-01-01",
      order_by: "popularity",
      sort_order: "desc",
      count: 80,
      offset: 0,
      limit: 50,
      seriess: [
        {
          id: "WEEKLY1",
          realtime_start: "2025-01-01",
          realtime_end: "2025-01-01",
          title: "Weekly Indicator 1",
          observation_start: "2020-01-01",
          observation_end: "2025-01-01",
          frequency: "Weekly",
          frequency_short: "W",
          units: "Index",
          units_short: "Index",
          seasonal_adjustment: "Seasonally Adjusted",
          seasonal_adjustment_short: "SA",
          last_updated: "2025-01-01",
          popularity: 90,
          notes: "Weekly economic indicator"
        }
      ]
    };

    // Mock fetch to return different responses based on the URL
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('filter_value=Daily')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDailyResponse)
        });
      } else if (url.includes('filter_value=Weekly')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockWeeklyResponse)
        });
      }
      return Promise.resolve({ ok: false });
    }) as jest.Mock;

    const result = await getHighFrequencyIndicators();

    // Verify fetch was called twice
    expect(global.fetch).toHaveBeenCalledTimes(2);
    
    // Verify the response structure
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    
    const parsedContent = JSON.parse(result.content[0].text);
    expect(parsedContent).toHaveProperty('description');
    expect(parsedContent).toHaveProperty('total_daily', 100);
    expect(parsedContent).toHaveProperty('total_weekly', 80);
    expect(parsedContent).toHaveProperty('showing_top');
    expect(parsedContent).toHaveProperty('indicators');
    expect(parsedContent.indicators).toHaveLength(2);
    
    // Verify indicators are sorted by popularity (Daily=95 should come first)
    expect(parsedContent.indicators[0].id).toBe("DAILY1");
    expect(parsedContent.indicators[0].popularity).toBe(95);
    expect(parsedContent.indicators[1].id).toBe("WEEKLY1");
    expect(parsedContent.indicators[1].popularity).toBe(90);
  });

  it('should respect custom limit parameter', async () => {
    const mockResponse = {
      realtime_start: "2025-01-01",
      realtime_end: "2025-01-01", 
      order_by: "popularity",
      sort_order: "desc",
      count: 50,
      offset: 0,
      limit: 25,
      seriess: []
    };

    global.fetch = jest.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })
    ) as jest.Mock;

    await getHighFrequencyIndicators(50);

    // Verify fetch was called twice (once for daily, once for weekly)
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn().mockImplementation(() => 
      Promise.resolve({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server Error')
      })
    ) as jest.Mock;

    await expect(getHighFrequencyIndicators()).rejects.toThrow(
      'Failed to get high frequency indicators'
    );
  });
});