export const productWebsite = 'https://ripple.arsvine.com';

export interface ProductDeveloper {
  name: string;
  github: string;
  website?: string;
}

/** Current author first, then remaining GitHub contributors by contribution count. */
export const productDevelopers: readonly ProductDeveloper[] = [
  { name: 'Arsvine', github: 'ArsvineZhu', website: 'https://www.arsvine.com' },
  { name: 'TopMyster', github: 'TopMyster' },
  {
    name: 'Thomas Boom',
    github: 'thomasboom',
    website: 'https://forgejo.thomasboom.com/thomasboom',
  },
  { name: 'Hackintosh_HD', github: 'Consciencieux' },
  { name: 'Kandarp Gajjar', github: 'slantie', website: 'https://slantie.vercel.app/' },
];

export function githubProfileUrl(login: string) {
  return `https://github.com/${login}`;
}

export function githubAvatarUrl(login: string) {
  return `https://github.com/${login}.png?size=128`;
}

export function formatDeveloperRoster(people: readonly ProductDeveloper[] = productDevelopers) {
  return people
    .map((person) => {
      const links = [githubProfileUrl(person.github)];
      if (person.website) links.push(person.website);
      return `- ${person.name} (${links.join(', ')})`;
    })
    .join('\n');
}
