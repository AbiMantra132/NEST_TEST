import { Controller, Post, Body, Param } from '@nestjs/common';

@Controller('profile')
export class ProfileController {
  @Post("/teams")
  getTeams(@Body() body: { userId: string }) {
    try {
      const { userId } = body;
      // Your logic here

    } catch (err) {
      // Handle error here
    }
  }

  @Post("/competitions")
  getCompetitions(@Body() body: { userId: string }) {
    try {
      const { userId } = body;
      // Your logic here
    } catch (err) {
      // Handle error here
    }
  }

  @Post("/reimburses")
  getReimburses(@Body() body: { userId: string }) {
    try {
      const { userId } = body;
      // Your logic here
    } catch (err) {
      // Handle error here
    }
  } 

  @Post("/reimburses/:id")
  getReimburseDetail(@Param('id') id: string, @Body() body: { userId: string }) {
    try {
      const { userId } = body;
      // Your logic here
    } catch (err) {
      // Handle error here
    }
  }
}
