interface Pokemon {
  id: number;
  order: number;
  name: string;
  height: number;
  weight: number;
}

const main = async (): Promise<Pokemon> => {
  const response = await fetch('https://pokeapi.co/api/v2/pokemon/garchomp/');
  if (!response.ok) {
    throw new Error('Response not okay');
  }

  const json = await response.json();

  return json as Pokemon;
};

main()
  .then((res) => {
    console.log(res);
  })
  .catch((err) => {
    console.error(err);
  });
