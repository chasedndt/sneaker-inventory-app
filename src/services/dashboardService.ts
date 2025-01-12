export interface DashboardData {
    totalInventory: number;
    activeListings: number;
    salesThisMonth: number;
    profitMargin: number;
  }
  
  export const fetchDashboardData = (): Promise<DashboardData> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          totalInventory: 500,
          activeListings: 250,
          salesThisMonth: 10000,
          profitMargin: 25,
        });
      }, 1000);
    });
  };
  