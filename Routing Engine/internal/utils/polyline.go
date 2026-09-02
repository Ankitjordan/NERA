package utils

import (
	"math"

	"routing-engine/internal/models"
)

// DecodePolyline decodes an encoded polyline string into an array of Coordinate structs.
// It uses a default precision of 5.
func DecodePolyline(str string, precision int) []models.Coordinate {
	if str == "" {
		return []models.Coordinate{}
	}

	var coordinates []models.Coordinate
	index := 0
	length := len(str)
	var lat, lng int
	factor := math.Pow(10, float64(precision))

	for index < length {
		var byteVal int
		shift := 0
		result := 0

		for {
			byteVal = int(str[index]) - 63
			index++
			result |= (byteVal & 0x1f) << shift
			shift += 5
			if byteVal < 0x20 {
				break
			}
		}

		var latitudeChange int
		if (result & 1) != 0 {
			latitudeChange = ^(result >> 1)
		} else {
			latitudeChange = result >> 1
		}
		lat += latitudeChange

		shift = 0
		result = 0

		for {
			byteVal = int(str[index]) - 63
			index++
			result |= (byteVal & 0x1f) << shift
			shift += 5
			if byteVal < 0x20 {
				break
			}
		}

		var longitudeChange int
		if (result & 1) != 0 {
			longitudeChange = ^(result >> 1)
		} else {
			longitudeChange = result >> 1
		}
		lng += longitudeChange

		coordinates = append(coordinates, models.Coordinate{
			Lat: float64(lat) / factor,
			Lng: float64(lng) / factor,
		})
	}

	return coordinates
}

// EncodePolyline encodes a slice of coordinates into a polyline string.
func EncodePolyline(coordinates []models.Coordinate, precision int) string {
	var result []byte
	var prevLat, prevLng int
	factor := math.Pow(10, float64(precision))

	encodeValue := func(v int) {
		v = v << 1
		if v < 0 {
			v = ^v
		}
		for v >= 0x20 {
			result = append(result, byte((0x20|(v&0x1f))+63))
			v >>= 5
		}
		result = append(result, byte(v+63))
	}

	for _, coord := range coordinates {
		lat := int(math.Round(coord.Lat * factor))
		lng := int(math.Round(coord.Lng * factor))

		dLat := lat - prevLat
		dLng := lng - prevLng

		encodeValue(dLat)
		encodeValue(dLng)

		prevLat = lat
		prevLng = lng
	}

	return string(result)
}
