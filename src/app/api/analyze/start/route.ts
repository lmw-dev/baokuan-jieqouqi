import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/logto-client'; 

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || !session.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { mediaFileId } = body;

    if (!mediaFileId) {
      return NextResponse.json({ error: 'mediaFileId is required' }, { status: 400 });
    }
    
    console.log(`=== Starting analysis for mediaFileId: ${mediaFileId}`);

    const mediaFile = await prisma.mediaFile.findUnique({
      where: { id: mediaFileId },
    });

    if (!mediaFile) {
      return NextResponse.json({ error: 'Media file not found' }, { status: 404 });
    }

    if (mediaFile.userId !== session.sub) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (mediaFile.status !== 'ready') {
        return NextResponse.json({ error: 'File is not ready for analysis' }, { status: 400 });
    }
    
    console.log('Media file ready for analysis:', mediaFile.originalFilename);

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
    console.log('=== Calling AI Web service at:', `${aiServiceUrl}/api/v1/web/analyze`);
    
    const analysisResponse = await fetch(`${aiServiceUrl}/api/v1/web/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_file_id: mediaFileId,
        user_id: session.sub,
        file_path: mediaFile.storagePath,
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('AI service error:', analysisResponse.status, errorText);
       return NextResponse.json({ 
           success: false, 
           error: 'AI_SERVICE_ERROR',
           details: `AI service error: ${analysisResponse.status} - ${errorText}`
       }, { status: 200 });
    }
    
    const analysisResult = await analysisResponse.json();

    return NextResponse.json({ success: true, data: analysisResult });

  } catch (error) {
    console.error('=== Error in start-analysis route ===', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as Error).message },
      { status: 500 }
    );
  }
} 