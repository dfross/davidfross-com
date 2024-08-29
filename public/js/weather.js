document.addEventListener('DOMContentLoaded', () => {
	const apiKey = '2d3f8dd4efa3453fb80164059242908'
	const location = '77441' // Adjust as needed
	const apiUrl = `http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${location}&aqi=no`

	fetch(apiUrl)
		.then((response) => response.json())
		.then((data) => {
			const tempF = data.current.temp_f
			const condition = data.current.condition.text

			document.getElementById('weather-temp').textContent = `${tempF}°F`
			document.getElementById('weather-condition').textContent = condition
		})
		.catch((error) => {
			console.error('Error fetching weather data:', error)
			document.getElementById('weather-temp').textContent = 'N/A'
			document.getElementById('weather-condition').textContent = 'Unable to fetch weather data.'
		})
})
