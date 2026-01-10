const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const deg2rad = (deg) => deg * (Math.PI / 180);

const calculateScore = (user, candidate) => {
  let score = 0;
  
  // 1. Distance Score (Max 25 points)
  let distance = 0;
  if (user.location?.coordinates && candidate.location?.coordinates) {
    distance = calculateDistance(
      user.location.coordinates[1], user.location.coordinates[0],
      candidate.location.coordinates[1], candidate.location.coordinates[0]
    );
  }
  
  if (distance <= 1) score += 25;
  else if (distance <= 5) score += 20;
  else if (distance <= 25) score += 15;
  else if (distance <= 50) score += 10;
  else if (distance <= 100) score += 5;

  // 2. Age Score (Max 20 points)
  const ageDiff = Math.abs(user.age - candidate.age);
  if (ageDiff <= 2) score += 20;
  else if (ageDiff <= 5) score += 18;
  else if (ageDiff <= 10) score += 15;
  else if (ageDiff <= 15) score += 10;
  else score += 5;

  // 3. Interests Score (Max 30 points) - Jaccard Similarity
  const userInterests = new Set(user.interests || []);
  const candidateInterests = new Set(candidate.interests || []);
  if (userInterests.size > 0 && candidateInterests.size > 0) {
    const intersection = [...userInterests].filter(x => candidateInterests.has(x));
    const union = new Set([...userInterests, ...candidateInterests]);
    const jaccard = intersection.length / union.size;
    score += Math.round(jaccard * 30);
  }

  // 4. Intent Score (Max 15 points)
  if (user.lookingFor === candidate.lookingFor) score += 15;
  else if (
    (['relationship', 'marriage'].includes(user.lookingFor) && ['relationship', 'marriage'].includes(candidate.lookingFor)) ||
    (['casual', 'friendship'].includes(user.lookingFor) && ['casual', 'friendship'].includes(candidate.lookingFor))
  ) {
    score += 10;
  }

  // 5. Gender Preference (Max 10 points)
  if (user.interestedIn?.includes(candidate.gender) && candidate.interestedIn?.includes(user.gender)) {
    score += 10;
  } else {
    score += 5;
  }

  return { 
    score: Math.min(score, 100), 
    distance 
  };
};

module.exports = { calculateScore, calculateDistance };