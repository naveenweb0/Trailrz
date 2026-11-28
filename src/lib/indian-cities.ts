export interface IndianCity {
  city: string;
  state: string;
  lat: number;
  lng: number;
  aliases?: string[];
}

/**
 * Comprehensive dataset of Indian cities across all states and union territories,
 * with internal coordinates for map links and location-dependent features.
 */
export const INDIAN_CITIES: IndianCity[] = [
  // Tricity & Punjab / Haryana / Chandigarh
  { city: "Chandigarh", state: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { city: "Mohali", state: "Punjab", lat: 30.7046, lng: 76.7179, aliases: ["SAS Nagar"] },
  { city: "Panchkula", state: "Haryana", lat: 30.6942, lng: 76.8606 },
  { city: "Amritsar", state: "Punjab", lat: 31.6340, lng: 74.8723 },
  { city: "Ludhiana", state: "Punjab", lat: 30.9010, lng: 75.8573 },
  { city: "Patiala", state: "Punjab", lat: 30.3398, lng: 76.3869 },
  { city: "Jalandhar", state: "Punjab", lat: 31.3260, lng: 75.5762 },
  { city: "Bathinda", state: "Punjab", lat: 30.2110, lng: 74.9455 },
  { city: "Zirakpur", state: "Punjab", lat: 30.6425, lng: 76.8173 },
  { city: "Gurugram", state: "Haryana", lat: 28.4595, lng: 77.0266, aliases: ["Gurgaon"] },
  { city: "Faridabad", state: "Haryana", lat: 28.4089, lng: 77.3178 },
  { city: "Ambala", state: "Haryana", lat: 30.3782, lng: 76.7767 },
  { city: "Karnal", state: "Haryana", lat: 29.6857, lng: 76.9905 },
  { city: "Panipat", state: "Haryana", lat: 29.3909, lng: 76.9635 },
  { city: "Hisar", state: "Haryana", lat: 29.1492, lng: 75.7217 },
  { city: "Rohtak", state: "Haryana", lat: 28.8955, lng: 76.6066 },

  // Delhi NCR
  { city: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.2090, aliases: ["New Delhi", "Delhi NCR"] },
  { city: "Noida", state: "Uttar Pradesh", lat: 28.5355, lng: 77.3910 },
  { city: "Greater Noida", state: "Uttar Pradesh", lat: 28.4744, lng: 77.5040 },
  { city: "Ghaziabad", state: "Uttar Pradesh", lat: 28.6692, lng: 77.4538 },

  // Maharashtra
  { city: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777, aliases: ["Bombay"] },
  { city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
  { city: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882 },
  { city: "Nashik", state: "Maharashtra", lat: 19.9975, lng: 73.7898 },
  { city: "Thane", state: "Maharashtra", lat: 19.2183, lng: 72.9781 },
  { city: "Navi Mumbai", state: "Maharashtra", lat: 19.0330, lng: 73.0297 },
  { city: "Chhatrapati Sambhajinagar", state: "Maharashtra", lat: 19.8762, lng: 75.3433, aliases: ["Aurangabad"] },
  { city: "Kolhapur", state: "Maharashtra", lat: 16.7050, lng: 74.2433 },

  // Karnataka
  { city: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946, aliases: ["Bangalore"] },
  { city: "Mysuru", state: "Karnataka", lat: 12.2958, lng: 76.6394, aliases: ["Mysore"] },
  { city: "Mangaluru", state: "Karnataka", lat: 12.9141, lng: 74.8560, aliases: ["Mangalore"] },
  { city: "Hubballi", state: "Karnataka", lat: 15.3647, lng: 75.1240, aliases: ["Hubli"] },
  { city: "Belagavi", state: "Karnataka", lat: 15.8497, lng: 74.4977, aliases: ["Belgaum"] },

  // Telangana & Andhra Pradesh
  { city: "Hyderabad", state: "Telangana", lat: 17.3850, lng: 78.4867 },
  { city: "Warangal", state: "Telangana", lat: 17.9689, lng: 79.5941 },
  { city: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185, aliases: ["Vizag"] },
  { city: "Vijayawada", state: "Andhra Pradesh", lat: 16.5062, lng: 80.6480 },
  { city: "Tirupati", state: "Andhra Pradesh", lat: 13.6288, lng: 79.4192 },
  { city: "Guntur", state: "Andhra Pradesh", lat: 16.3067, lng: 80.4365 },

  // Tamil Nadu & Puducherry
  { city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, aliases: ["Madras"] },
  { city: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558 },
  { city: "Madurai", state: "Tamil Nadu", lat: 9.9252, lng: 78.1198 },
  { city: "Tiruchirappalli", state: "Tamil Nadu", lat: 10.7905, lng: 78.7047, aliases: ["Trichy"] },
  { city: "Salem", state: "Tamil Nadu", lat: 11.6643, lng: 78.1460 },
  { city: "Ooty", state: "Tamil Nadu", lat: 11.4102, lng: 76.6950 },
  { city: "Puducherry", state: "Puducherry", lat: 11.9416, lng: 79.8083, aliases: ["Pondicherry"] },

  // Rajasthan
  { city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
  { city: "Udaipur", state: "Rajasthan", lat: 24.5854, lng: 73.7125 },
  { city: "Jodhpur", state: "Rajasthan", lat: 26.2389, lng: 73.0243 },
  { city: "Kota", state: "Rajasthan", lat: 25.2138, lng: 75.8648 },
  { city: "Jaisalmer", state: "Rajasthan", lat: 26.9157, lng: 70.9083 },
  { city: "Ajmer", state: "Rajasthan", lat: 26.4499, lng: 74.6399 },
  { city: "Pushkar", state: "Rajasthan", lat: 26.4899, lng: 74.5511 },

  // Gujarat & Dadra and Nagar Haveli and Daman and Diu
  { city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714 },
  { city: "Surat", state: "Gujarat", lat: 21.1702, lng: 72.8311 },
  { city: "Vadodara", state: "Gujarat", lat: 22.3072, lng: 73.1812, aliases: ["Baroda"] },
  { city: "Rajkot", state: "Gujarat", lat: 22.3039, lng: 70.8022 },
  { city: "Gandhinagar", state: "Gujarat", lat: 23.2156, lng: 72.6369 },
  { city: "Daman", state: "Dadra and Nagar Haveli and Daman and Diu", lat: 20.3974, lng: 72.8328 },
  { city: "Silvassa", state: "Dadra and Nagar Haveli and Daman and Diu", lat: 20.2763, lng: 73.0083 },

  // Uttar Pradesh
  { city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462 },
  { city: "Kanpur", state: "Uttar Pradesh", lat: 26.4499, lng: 80.3319 },
  { city: "Varanasi", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739, aliases: ["Benares", "Kashi"] },
  { city: "Agra", state: "Uttar Pradesh", lat: 27.1767, lng: 78.0081 },
  { city: "Prayagraj", state: "Uttar Pradesh", lat: 25.4358, lng: 81.8463, aliases: ["Allahabad"] },
  { city: "Meerut", state: "Uttar Pradesh", lat: 28.9845, lng: 77.7064 },

  // West Bengal
  { city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, aliases: ["Calcutta"] },
  { city: "Siliguri", state: "West Bengal", lat: 26.7271, lng: 88.3953 },
  { city: "Darjeeling", state: "West Bengal", lat: 27.0410, lng: 88.2663 },
  { city: "Durgapur", state: "West Bengal", lat: 23.5204, lng: 87.3119 },

  // Kerala & Lakshadweep
  { city: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673, aliases: ["Cochin"] },
  { city: "Thiruvananthapuram", state: "Kerala", lat: 8.5241, lng: 76.9366, aliases: ["Trivandrum"] },
  { city: "Kozhikode", state: "Kerala", lat: 11.2588, lng: 75.7804, aliases: ["Calicut"] },
  { city: "Thrissur", state: "Kerala", lat: 10.5276, lng: 76.2144 },
  { city: "Munnar", state: "Kerala", lat: 10.0889, lng: 77.0595 },
  { city: "Kavaratti", state: "Lakshadweep", lat: 10.5593, lng: 72.6358 },

  // Goa
  { city: "Panaji", state: "Goa", lat: 15.4909, lng: 73.8278, aliases: ["Goa", "Panjim"] },
  { city: "Margao", state: "Goa", lat: 15.2832, lng: 73.9862 },
  { city: "Vasco da Gama", state: "Goa", lat: 15.3982, lng: 73.8113 },

  // Himachal Pradesh
  { city: "Shimla", state: "Himachal Pradesh", lat: 31.1048, lng: 77.1734 },
  { city: "Manali", state: "Himachal Pradesh", lat: 32.2432, lng: 77.1892 },
  { city: "Dharamshala", state: "Himachal Pradesh", lat: 32.2190, lng: 76.3234 },
  { city: "Kasauli", state: "Himachal Pradesh", lat: 30.9013, lng: 76.9649 },
  { city: "Solan", state: "Himachal Pradesh", lat: 30.9045, lng: 77.0967 },

  // Uttarakhand
  { city: "Dehradun", state: "Uttarakhand", lat: 30.3165, lng: 78.0322 },
  { city: "Rishikesh", state: "Uttarakhand", lat: 30.0869, lng: 78.2676 },
  { city: "Mussoorie", state: "Uttarakhand", lat: 30.4598, lng: 78.0644 },
  { city: "Nainital", state: "Uttarakhand", lat: 29.3919, lng: 79.4542 },
  { city: "Haridwar", state: "Uttarakhand", lat: 29.9457, lng: 78.1642 },

  // Madhya Pradesh & Chhattisgarh
  { city: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577 },
  { city: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126 },
  { city: "Gwalior", state: "Madhya Pradesh", lat: 26.2183, lng: 78.1828 },
  { city: "Jabalpur", state: "Madhya Pradesh", lat: 23.1815, lng: 79.9864 },
  { city: "Ujjain", state: "Madhya Pradesh", lat: 23.1765, lng: 75.7885 },
  { city: "Raipur", state: "Chhattisgarh", lat: 21.2514, lng: 81.6296 },
  { city: "Bilaspur", state: "Chhattisgarh", lat: 22.0797, lng: 82.1409 },

  // Bihar & Jharkhand
  { city: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376 },
  { city: "Gaya", state: "Bihar", lat: 24.7914, lng: 85.0002 },
  { city: "Ranchi", state: "Jharkhand", lat: 23.3441, lng: 85.3096 },
  { city: "Jamshedpur", state: "Jharkhand", lat: 22.8046, lng: 86.2029 },
  { city: "Dhanbad", state: "Jharkhand", lat: 23.7957, lng: 86.4304 },

  // Odisha
  { city: "Bhubaneswar", state: "Odisha", lat: 20.2961, lng: 85.8245 },
  { city: "Cuttack", state: "Odisha", lat: 20.4625, lng: 85.8830 },
  { city: "Puri", state: "Odisha", lat: 19.8135, lng: 85.8312 },

  // North-East States
  { city: "Guwahati", state: "Assam", lat: 26.1445, lng: 91.7362 },
  { city: "Dibrugarh", state: "Assam", lat: 27.4728, lng: 94.9120 },
  { city: "Shillong", state: "Meghalaya", lat: 25.5788, lng: 91.8933 },
  { city: "Gangtok", state: "Sikkim", lat: 27.3314, lng: 88.6138 },
  { city: "Imphal", state: "Manipur", lat: 24.8170, lng: 93.9368 },
  { city: "Aizawl", state: "Mizoram", lat: 23.7271, lng: 92.7176 },
  { city: "Kohima", state: "Nagaland", lat: 25.6751, lng: 94.1086 },
  { city: "Dimapur", state: "Nagaland", lat: 25.9091, lng: 93.7266 },
  { city: "Agartala", state: "Tripura", lat: 23.8315, lng: 91.2868 },
  { city: "Itanagar", state: "Arunachal Pradesh", lat: 27.0844, lng: 93.6053 },

  // Jammu & Kashmir, Ladakh, Andaman & Nicobar
  { city: "Srinagar", state: "Jammu and Kashmir", lat: 34.0837, lng: 74.7973 },
  { city: "Jammu", state: "Jammu and Kashmir", lat: 32.7266, lng: 74.8570 },
  { city: "Leh", state: "Ladakh", lat: 34.1526, lng: 77.5771 },
  { city: "Sri Vijaya Puram", state: "Andaman and Nicobar Islands", lat: 11.6234, lng: 92.7265, aliases: ["Port Blair"] },
];

/**
 * Finds a matching city entry (case-insensitive, checks city name and aliases).
 */
export function findIndianCity(cityName?: string | null): IndianCity | null {
  if (!cityName) return null;
  const q = cityName.trim().toLowerCase();
  if (!q) return null;
  return (
    INDIAN_CITIES.find(
      (c) =>
        c.city.toLowerCase() === q ||
        c.aliases?.some((a) => a.toLowerCase() === q)
    ) || null
  );
}

/**
 * Searches Indian cities by city name, alias, or state.
 */
export function searchIndianCities(query: string, limit = 30): IndianCity[] {
  const q = (query || "").trim().toLowerCase();
  if (!q) return INDIAN_CITIES.slice(0, limit);
  const exact: IndianCity[] = [];
  const prefix: IndianCity[] = [];
  const contains: IndianCity[] = [];

  for (const c of INDIAN_CITIES) {
    const cityL = c.city.toLowerCase();
    const stateL = c.state.toLowerCase();
    const aliasMatch = c.aliases?.some((a) => a.toLowerCase().includes(q));
    if (cityL === q) {
      exact.push(c);
    } else if (cityL.startsWith(q)) {
      prefix.push(c);
    } else if (cityL.includes(q) || stateL.includes(q) || aliasMatch) {
      contains.push(c);
    }
  }

  return [...exact, ...prefix, ...contains].slice(0, limit);
}
