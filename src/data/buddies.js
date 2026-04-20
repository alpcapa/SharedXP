import { getDateKey } from "../utils/date";

const getDateFromOffset = (offset) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return getDateKey(date.getFullYear(), date.getMonth(), date.getDate());
};

const buildAvailableDates = (offsets) => offsets.map((offset) => getDateFromOffset(offset));

export const buddies = [
  {
    id: 1,
    name: "João",
    fullName: "João Oliveira",
    sport: "Cycling",
    gender: "Male",
    bio: "Love coastal rides & coffee stops ☕",
    bikeAvailable: true,
    price: 30,
    priceUnit: "per session",
    rating: 4.9,
    reviewCount: 32,
    image: "https://randomuser.me/api/portraits/men/32.jpg",
    location: "Lisbon, Portugal",
    coordinates: { lat: 38.7223, lng: -9.1393 },
    memberSince: "2021",
    level: "Intermediate",
    language: "Portuguese, English",
    about:
      "I ride local routes every weekend and love meeting visitors looking for scenic rides.",
    gallery: [
      "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1559348349-86f1f65817fe?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80"
    ],
    bike: {
      brand: "Trek",
      model: "Domane SL 6",
      type: "Road"
    },
    availableDates: buildAvailableDates([1, 3, 5, 8, 11, 14, 20, 27]),
    availableTimes: ["07:00", "08:30", "18:00", "19:30"],
    availabilitySchedule: ["Weekdays after 18:00", "Saturday mornings"],
    reviews: [
      {
        author: "Lena",
        overall: 5,
        punctuality: 5,
        equipmentQuality: 5,
        localKnowledge: 4,
        friendliness: 5,
        value: 4,
        comment: "João planned a safe and beautiful route near the river."
      },
      {
        author: "Carlos",
        overall: 4,
        punctuality: 4,
        equipmentQuality: 4,
        localKnowledge: 4,
        friendliness: 5,
        value: 4,
        comment: "Great pace and very friendly host."
      }
    ]
  },
  {
    id: 2,
    name: "Marta",
    fullName: "Marta Santos",
    sport: "Tennis",
    gender: "Female",
    bio: "Court sessions with local tennis tips.",
    bikeAvailable: true,
    price: 35,
    priceUnit: "per session",
    rating: 5.0,
    reviewCount: 18,
    image: "https://randomuser.me/api/portraits/women/44.jpg",
    location: "Lisbon, Portugal",
    coordinates: { lat: 38.7369, lng: -9.1427 },
    memberSince: "2020",
    level: "Advanced",
    language: "Portuguese, English",
    about:
      "I host dynamic tennis sessions in Lisbon, from controlled rallies to match-play with tactical tips.",
    gallery: [
      "https://images.unsplash.com/photo-1529422643029-d4585747aaf2?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1511994298241-608e28f14fde?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1520975693412-3f6de3d8158f?auto=format&fit=crop&w=600&q=80"
    ],
    bike: null,
    availableDates: buildAvailableDates([2, 4, 6, 9, 13, 16, 22, 29]),
    availableTimes: ["06:30", "09:00", "17:30"],
    availabilitySchedule: ["Tuesday and Thursday 17:30", "Sunday 09:00"],
    reviews: [
      {
        author: "Iris",
        overall: 5,
        punctuality: 5,
        equipmentQuality: 4,
        localKnowledge: 5,
        friendliness: 5,
        value: 4,
        comment: "Amazing coach with clear feedback and a super fun tennis session."
      },
      {
        author: "Pedro",
        overall: 4,
        punctuality: 5,
        equipmentQuality: 5,
        localKnowledge: 4,
        friendliness: 4,
        value: 4,
        comment: "Great communication and a really strong hitting partner."
      }
    ]
  },
  {
    id: 3,
    name: "Rafael",
    fullName: "Rafael Costa",
    sport: "Running",
    gender: "Male",
    bio: "Fast intervals and scenic city runs.",
    bikeAvailable: false,
    price: 25,
    priceUnit: "per session",
    rating: 4.8,
    reviewCount: 27,
    image: "https://randomuser.me/api/portraits/men/55.jpg",
    location: "Lisbon, Portugal",
    coordinates: { lat: 38.7104, lng: -9.1459 },
    memberSince: "2022",
    level: "Advanced",
    language: "Portuguese, English",
    about:
      "I lead city runs and interval sessions along Lisbon routes, adapting the pace to your level and goals.",
    gallery: [
      "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1622279457486-62dcc4a431d8?auto=format&fit=crop&w=600&q=80"
    ],
    bike: null,
    availableDates: buildAvailableDates([1, 4, 7, 10, 12, 18, 24, 30]),
    availableTimes: ["07:30", "10:00", "19:00"],
    availabilitySchedule: ["Weeknights after 19:00", "Saturday afternoon"],
    reviews: [
      {
        author: "Mia",
        overall: 5,
        punctuality: 5,
        localKnowledge: 4,
        friendliness: 5,
        value: 4,
        comment: "Super welcoming and set the perfect running pace for me."
      },
      {
        author: "Tom",
        overall: 4,
        punctuality: 4,
        localKnowledge: 4,
        friendliness: 4,
        value: 4,
        comment: "Great route, good coaching cues, and easy coordination."
      }
    ]
  },
  {
    id: 4,
    name: "Inês",
    fullName: "Inês Ferreira",
    sport: "Basketball",
    gender: "Female",
    bio: "Friendly pickup games and shooting drills.",
    bikeAvailable: true,
    price: 28,
    priceUnit: "per session",
    rating: 4.9,
    reviewCount: 21,
    image: "https://randomuser.me/api/portraits/women/65.jpg",
    location: "Lisbon, Portugal",
    coordinates: { lat: 38.7281, lng: -9.1635 },
    memberSince: "2023",
    level: "Intermediate",
    language: "Portuguese, English",
    about:
      "I organize friendly pickup basketball games and shooting drills focused on fundamentals and confidence.",
    gallery: [
      "https://images.unsplash.com/photo-1622279457486-62dcc4a431d8?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1499510318569-0c17cf6d1eb3?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1560012057-437c6a8bf77f?auto=format&fit=crop&w=600&q=80"
    ],
    bike: null,
    availableDates: buildAvailableDates([3, 5, 8, 11, 15, 19, 25, 31]),
    availableTimes: ["08:00", "11:00", "18:30"],
    availabilitySchedule: ["Monday and Wednesday 18:30", "Sunday afternoon"],
    reviews: [
      {
        author: "Alex",
        overall: 5,
        punctuality: 5,
        localKnowledge: 4,
        friendliness: 5,
        value: 4,
        comment: "Great rally partner and very punctual."
      },
      {
        author: "Sara",
        overall: 4,
        punctuality: 4,
        localKnowledge: 4,
        friendliness: 5,
        value: 4,
        comment: "Helpful tips and a really fun game."
      }
    ]
  }
];
