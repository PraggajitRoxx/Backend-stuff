import express from 'express';
import {OpenAI} from 'openai';
import bodyParser from 'body-parser';
import cors from 'cors';
import multer from 'multer';
//import axios from 'axios';
import fs from 'fs';
import { promisify } from 'util';

const app = express();
const port = 3000;

const openai = new OpenAI({
  apiKey: "", // Replace with your actual API key
});

app.use(bodyParser.json());
app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage});

async function getChatCompletion(userMessage) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Use the correct model ID
      messages: [{ role: "system", content: userMessage }],
    });
    //console.log(completion.choices[0].message.content); // Log the response
    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Error creating chat completion:", error.response ? error.response.data : error.message);
    throw error;
  }
}
//Audio transcribtion through whisper model(open AI)
async function transcribeAudio(audioBuffer) {
    try {
      // Save the audio buffer to a temporary file
      const tempFilePath = './temp_audio.wav';
      await promisify(fs.writeFile)(tempFilePath, audioBuffer);
  
      // Transcribe the audio using OpenAI's API
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-1",
      });
  
      // Clean up the temporary file
      await promisify(fs.unlink)(tempFilePath);
  
      return transcription.text;
    } catch (error) {
      console.error("Error transcribing audio:", error.response ? error.response.data : error.message);
      throw error;
    }
}

// Create a simple Express API that calls the function above
app.post('/chat', async (req, res) => {
  const { message } = req.body;
  try {
    const response = await getChatCompletion(message);
    res.json({ message: response });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get chat completion' });
  }
});

// create a simple express API that calls the Audio function Above
app.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
      const transcription = await transcribeAudio(req.file.buffer);
      const response = await getChatCompletion(transcription);
      res.json({ message: response });
    } catch (error) {
      res.status(500).json({ error: 'Failed to transcribe audio' });
    }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});