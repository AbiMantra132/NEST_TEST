async function signup() {
  const url = 'https://lomba-backend.vercel.app/auth/signup';
  const data = {
    name: "Ida Bagus Dharma Abimantra",
    email: "adimantra123@gmail.com",
    nim: "2401020051",
    password: "abimantra132",
    major: "INFORMATIKA",
    cohort: "2024"
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const responseData = await response.json();
    console.log('Success:', responseData);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Call the signup function
signup();
