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
    bio: "Love coastal rides & coffee stops ☕",
    bikeAvailable: true,
    price: 30,
    rating: 4.9,
    reviewCount: 32,
    image: "https://randomuser.me/api/portraits/men/32.jpg",
    location: "Lisbon, Portugal",
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
        rating: 5,
        comment: "João planned a safe and beautiful route near the river."
      },
      {
        author: "Carlos",
        rating: 5,
        comment: "Great pace and very friendly host."
      }
    ]
  },
  {
    id: 2,
    name: "Marta",
    fullName: "Marta Santos",
    sport: "Cycling",
    bio: "Gravel adventures & hidden trails.",
    bikeAvailable: true,
    price: 35,
    rating: 5.0,
    reviewCount: 18,
    image: "https://randomuser.me/api/portraits/women/44.jpg",
    location: "Lisbon, Portugal",
    memberSince: "2020",
    level: "Advanced",
    language: "Portuguese, English",
    about:
      "I host gravel and endurance rides around Sintra and can share tips for local trails.",
    gallery: [
      "https://images.unsplash.com/photo-1529422643029-d4585747aaf2?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1511994298241-608e28f14fde?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1520975693412-3f6de3d8158f?auto=format&fit=crop&w=600&q=80"
    ],
    bike: {
      brand: "Canyon",
      model: "Grail CF SL",
      type: "Gravel"
    },
    availableDates: buildAvailableDates([2, 4, 6, 9, 13, 16, 22, 29]),
    availableTimes: ["06:30", "09:00", "17:30"],
    availabilitySchedule: ["Tuesday and Thursday 17:30", "Sunday 09:00"],
    reviews: [
      {
        author: "Iris",
        rating: 5,
        comment: "Amazing guide with tons of local knowledge."
      },
      {
        author: "Pedro",
        rating: 5,
        comment: "Great communication and excellent bike condition."
      }
    ]
  },
  {
    id: 3,
    name: "Rafael",
    fullName: "Rafael Costa",
    sport: "Cycling",
    bio: "Fast group rides, always pushing.",
    bikeAvailable: false,
    price: 25,
    rating: 4.8,
    reviewCount: 27,
    image: "https://randomuser.me/api/portraits/men/55.jpg",
    location: "Lisbon, Portugal",
    memberSince: "2022",
    level: "Advanced",
    language: "Portuguese, English",
    about:
      "I lead fast-paced group rides around Lisbon and love helping cyclists push their limits.",
    gallery: [
      "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1622279457486-62dcc4a431d8?auto=format&fit=crop&w=600&q=80"
    ],
    bike: {
      brand: "N/A",
      model: "N/A",
      type: "No bike"
    },
    availableDates: buildAvailableDates([1, 4, 7, 10, 12, 18, 24, 30]),
    availableTimes: ["07:30", "10:00", "19:00"],
    availabilitySchedule: ["Weeknights after 19:00", "Saturday afternoon"],
    reviews: [
      {
        author: "Mia",
        rating: 5,
        comment: "Super welcoming and found a great court quickly."
      },
      {
        author: "Tom",
        rating: 4,
        comment: "Fun match and easy to coordinate."
      }
    ]
  },
  {
    id: 4,
    name: "Inês",
    fullName: "Inês Ferreira",
    sport: "Cycling",
    bio: "Relaxed pace, big climbs & good talks.",
    bikeAvailable: true,
    price: 28,
    rating: 4.9,
    reviewCount: 21,
    image: "https://randomuser.me/api/portraits/women/65.jpg",
    location: "Lisbon, Portugal",
    memberSince: "2023",
    level: "Intermediate",
    language: "Portuguese, English",
    about:
      "I enjoy scenic climbs around Serra de Sintra and love riding at a comfortable pace with good company.",
    gallery: [
      "https://images.unsplash.com/photo-1622279457486-62dcc4a431d8?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1499510318569-0c17cf6d1eb3?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1560012057-437c6a8bf77f?auto=format&fit=crop&w=600&q=80"
    ],
    bike: {
      brand: "N/A",
      model: "N/A",
      type: "No bike"
    },
    availableDates: buildAvailableDates([3, 5, 8, 11, 15, 19, 25, 31]),
    availableTimes: ["08:00", "11:00", "18:30"],
    availabilitySchedule: ["Monday and Wednesday 18:30", "Sunday afternoon"],
    reviews: [
      {
        author: "Alex",
        rating: 5,
        comment: "Great rally partner and very punctual."
      },
      {
        author: "Sara",
        rating: 4,
        comment: "Helpful tips and a really fun game."
      }
    ]
  }
];
