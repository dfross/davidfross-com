import axios from 'axios'

interface Condition {
	text: string
}

interface CurrentWeather {
	temp_f: number
	condition: Condition
}

interface WeatherApiResponse {
	current: CurrentWeather
}

const apiKey = '2d3f8dd4efa3453fb80164059242908'
const location = '77441'
const apiUrl = `http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${location}&aqi=no`

export async function getWeather(): Promise<{ temp_f: number | null; condition: string }> {
	try {
		const response = await axios.get<WeatherApiResponse>(apiUrl)
		const { temp_f, condition } = response.data.current
		return {
			temp_f,
			condition: condition.text // Access the condition text
		}
	} catch (error) {
		console.error('Error fetching weather data:', error)
		return {
			temp_f: null,
			condition: 'Unable to fetch weather data.'
		}
	}
}
