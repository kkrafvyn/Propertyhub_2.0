import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/badge';
import {
  Heart,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Star,
  MapPin,
  Home,
  DollarSign,
  Filter,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Clock,
} from 'lucide-react';

interface RecommendedProperty {
  id: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  category: string;
  image?: string;
  matchScore: number;
  matchReason: string;
  liked: boolean;
  rating: number;
  daysNew: number;
}

interface UserPreferences {
  location: string[];
  priceRange: [number, number];
  propertyTypes: string[];
  features: string[];
  amenities: string[];
}

export default function RecommendationEngine() {
  const [recommendations, setRecommendations] = useState<RecommendedProperty[]>([
    {
      id: '1',
      address: '123 Wellness Street, Central Accra',
      price: 180000,
      bedrooms: 3,
      bathrooms: 2,
      category: 'apartment',
      matchScore: 94,
      matchReason: 'Matches your budget & location preference with modern amenities',
      liked: false,
      rating: 4.8,
      daysNew: 2,
    },
    {
      id: '2',
      address: '456 Garden Heights, North District',
      price: 220000,
      bedrooms: 4,
      bathrooms: 3,
      category: 'house',
      matchScore: 89,
      matchReason: 'Premium location with your preferred features',
      liked: false,
      rating: 4.6,
      daysNew: 5,
    },
    {
      id: '3',
      address: '789 Sunset Plaza, East Coast',
      price: 210000,
      bedrooms: 3,
      bathrooms: 2,
      category: 'apartment',
      matchScore: 87,
      matchReason: 'Great investment opportunity in emerging area',
      liked: false,
      rating: 4.5,
      daysNew: 1,
    },
    {
      id: '4',
      address: '321 Tech Hub Office, Business District',
      price: 150000,
      bedrooms: 2,
      bathrooms: 1,
      category: 'office',
      matchScore: 85,
      matchReason: 'Perfect for work-life balance seekers',
      liked: false,
      rating: 4.7,
      daysNew: 3,
    },
  ]);

  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('match');
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    location: ['Central Accra', 'North District'],
    priceRange: [150000, 250000],
    propertyTypes: ['apartment', 'house'],
    features: ['modern', 'furnished'],
    amenities: ['gym', 'parking', 'security'],
  });

  const toggleLike = (id: string) => {
    setRecommendations(
      recommendations.map(rec =>
        rec.id === id ? { ...rec, liked: !rec.liked } : rec
      )
    );
  };

  const handleRecommendation = (id: string, reaction: 'like' | 'dislike') => {
    console.log(`User ${reaction}d property:`, id);
    toggleLike(id);
  };

  const refreshRecommendations = () => {
    console.log('Refreshing recommendations...');
    setRecommendations(
      recommendations.map(rec => ({
        ...rec,
        matchScore: Math.floor(Math.random() * (95 - 75) + 75),
      }))
    );
  };

  const filteredRecommendations = recommendations
    .filter(rec => filterType === 'all' || rec.category === filterType)
    .sort((a, b) => {
      if (sortBy === 'match') return b.matchScore - a.matchScore;
      if (sortBy === 'price') return a.price - b.price;
      if (sortBy === 'new') return a.daysNew - b.daysNew;
      return 0;
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-yellow-500" />
            Smart Recommendations
          </h1>
          <p className="text-gray-500 mt-1">
            AI-powered suggestions based on your preferences and search history
          </p>
        </div>
        <Button onClick={refreshRecommendations} className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Your Preferences Summary */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Your Preferences
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm text-gray-600 block mb-2">Preferred Locations</span>
            <div className="flex flex-wrap gap-2">
              {userPreferences.location.map(loc => (
                <Badge key={loc} variant="outline">
                  📍 {loc}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-600 block mb-2">Budget Range</span>
            <div className="font-medium">
              ₦{userPreferences.priceRange[0].toLocaleString()} - ₦
              {userPreferences.priceRange[1].toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-600 block mb-2">Property Types</span>
            <div className="flex flex-wrap gap-2">
              {userPreferences.propertyTypes.map(type => (
                <Badge key={type} className="bg-blue-100 text-blue-800 capitalize">
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Filter & Sort Controls */}
      <div className="flex gap-4 items-center">
        <div>
          <label htmlFor="recommendation-filter-type" className="sr-only">
            Filter recommendations by property type
          </label>
          <select
            id="recommendation-filter-type"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
            aria-label="Filter recommendations by property type"
            title="Filter recommendations by property type"
          >
            <option value="all">All Property Types</option>
            <option value="apartment">Apartments</option>
            <option value="house">Houses</option>
            <option value="office">Office Spaces</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>
        <div>
          <label htmlFor="recommendation-sort-by" className="sr-only">
            Sort recommendations
          </label>
          <select
            id="recommendation-sort-by"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
            aria-label="Sort recommendations"
            title="Sort recommendations"
          >
            <option value="match">Best Match</option>
            <option value="price">Lowest Price</option>
            <option value="new">Newest</option>
          </select>
        </div>
        <div className="ml-auto text-sm text-gray-600">
          Showing {filteredRecommendations.length} recommendations
        </div>
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredRecommendations.map(property => (
          <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {/* Header with Image Placeholder */}
            <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 relative">
              <div className="absolute top-4 right-4 flex gap-2">
                <Badge className="bg-blue-600">
                  {property.matchScore}% Match
                </Badge>
                {property.daysNew <= 3 && (
                  <Badge className="bg-green-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    New
                  </Badge>
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <Home className="w-16 h-16" />
              </div>
            </div>

            {/* Property Details */}
            <div className="p-6 space-y-4">
              {/* Title & Rating */}
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold">{property.address}</h3>
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {property.category.toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      ₦{property.price.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500 text-sm mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(property.rating)
                              ? 'fill-yellow-500'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="text-gray-700 ml-1">({property.rating})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Reason */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{property.matchReason}</span>
                </p>
              </div>

              {/* Property Details */}
              <div className="grid grid-cols-3 gap-3 py-3 border-t border-b">
                <div className="text-center">
                  <Home className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <div className="text-sm font-medium">{property.bedrooms}</div>
                  <div className="text-xs text-gray-600">Bedrooms</div>
                </div>
                <div className="text-center">
                  <Home className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <div className="text-sm font-medium">{property.bathrooms}</div>
                  <div className="text-xs text-gray-600">Bathrooms</div>
                </div>
                <div className="text-center">
                  <TrendingUp className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <div className="text-sm font-medium">{property.daysNew}d</div>
                  <div className="text-xs text-gray-600">Days New</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleRecommendation(property.id, 'like')}
                  className={`flex-1 flex items-center justify-center gap-2 ${
                    property.liked
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${property.liked ? 'fill-white' : ''}`}
                  />
                  {property.liked ? 'Liked' : 'Like'}
                </Button>
                <Button variant="outline" className="flex-1 flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  className="px-4"
                  aria-label={`Give positive feedback for ${property.address}`}
                  title={`Give positive feedback for ${property.address}`}
                >
                  <ThumbsUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  className="px-4"
                  aria-label={`Give negative feedback for ${property.address}`}
                  title={`Give negative feedback for ${property.address}`}
                >
                  <ThumbsDown className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Liked Properties Summary */}
      {recommendations.some(r => r.liked) && (
        <Card className="p-6 bg-green-50 border-2 border-green-200">
          <h3 className="font-bold text-green-900 mb-3">❤️ Liked Properties</h3>
          <p className="text-green-800 mb-4">
            You've liked {recommendations.filter(r => r.liked).length} properties. 
            Save them to create a shortlist or share with partners.
          </p>
          <div className="flex gap-2">
            <Button className="bg-green-600 hover:bg-green-700">
              Save Shortlist
            </Button>
            <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
              Share with Team
            </Button>
          </div>
        </Card>
      )}

      {/* Recommendation Insights */}
      <Card className="p-6 bg-purple-50">
        <h3 className="font-bold text-purple-900 mb-4">🤖 Recommendation Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold text-purple-600">92%</div>
            <p className="text-sm text-purple-800">Average match confidence</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">4</div>
            <p className="text-sm text-purple-800">New matches this week</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">Save $12K</div>
            <p className="text-sm text-purple-800">Average savings on your criteria</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
