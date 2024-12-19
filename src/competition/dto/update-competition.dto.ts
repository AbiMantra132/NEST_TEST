export class UpdateCompetitionDto {
  title?: string;
  description?: string;
  category?: string;
  level?: level;
  type?: type;
  imagePoster?: string;
  linkGuidebook?: string;
  linkPendaftaran?: string;
  startDate?: Date;
  endDate?: Date;
}

enum level {
  Provinsi = 'Provinsi',
  Nasional = 'Nasional',
  Internasional = 'Internasional',
}

enum type {
  Individu = 'Individu',
  Team = 'Team',
}