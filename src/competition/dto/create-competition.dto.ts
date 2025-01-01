export class CreateCompetitionDto {
  title: string;
  description: string;
  category: string;
  level: level;
  type: type;
  linkGuidebook: string;
  linkPendaftaran: string;
  startDate: Date;
  endDate: Date;
}

enum level {
  Provinsi = "Provinsi",
  Nasional = "Nasional",
  Internasional = "Internasional"
}

enum type {
  Individu = "Individu",
  Team = "Team"
}